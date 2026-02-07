import { LRUCache } from 'lru-cache'
import pako from 'pako'
import diff from 'fast-diff'
import { BloomFilter } from '../BloomFilter'
import { BlobHash } from '../vcs/Commit'
import { BLOB_STORE, DELTA_STORE } from './ClientStorage'
import { createContextLogger } from '../logs/logger'
import { Sha256Hash } from '../Sha256Hash'

const logger = createContextLogger('blob-storage')

type StoreName = typeof DELTA_STORE | typeof BLOB_STORE

const MAX_DELTA_CHAIN_COUNT = 50

// TODO: Run in web worker, diffing algorithm can be expensive
/**
 * Blob storage, storing changes mostly in deltas but also as complete blob
 */
export class BlobStorage {
  constructor(private readonly db: IDBDatabase) {}

  deltaFilter: BloomFilter = BloomFilter.withTargetError(2000, 0.01)
  async get(hash: BlobHash): Promise<string | null> {
    const id = hash.toBase64()
    if (this.deltaFilter.test(id)) {
      return await this.reconstructFromDelta(id)
    }
    const blob = await this.getBlob(id)
    if (blob !== null) {
      return blob
    }
    const delta = await this._get('delta', id)
    if (delta !== null) {
      this.deltaFilter.add(id)
      return await this.reconstructFromDelta(id)
    }
    return null
  }

  private async reconstructFromDelta(
    identifier: string,
  ): Promise<string | null> {
    const delta = await this._get('delta', identifier)
    if (delta == null) return null
    const { base: baseHash, ops } = dedeltize(delta)
    const base = await this.get(baseHash)
    if (base == null) {
      logger.error('Could not find base of delta ' + identifier)
      return null
    }
    let result = ''
    for (const op of ops) {
      switch (op.type) {
        case DeltaType.Copy: {
          result += base.slice(op.offset, op.offset + op.length)
          continue
        }
        case DeltaType.Insert: {
          result += op.data
          continue
        }
      }
    }
    return result
  }

  private async getBlob(identifier: string) {
    const b = await this._get('blobs', identifier)
    if (b === null) return null
    const decoder = new TextDecoder()
    const str = decoder.decode(b)
    return str
  }

  private async _get(
    storeName: StoreName,
    identifier: string,
  ): Promise<null | Uint8Array<ArrayBuffer>> {
    const trans = this.db.transaction(storeName)
    return await new Promise((resolve, reject) => {
      trans.onerror = (_e) => {
        reject(new Error(`failed to set value: ${trans.error?.message ?? ''}`))
      }
      const store = trans.objectStore(storeName)
      const req = store.get(identifier)
      req.onsuccess = () => {
        if (typeof req.result === 'undefined') return resolve(null)

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const out = pako.inflate(req.result)

        resolve(out)
      }
      req.onerror = (_e) => {
        reject(new Error(`failed to get item: ${req.error?.message ?? ''}`))
      }
    })
  }

  deltaChainCountCache = new LRUCache<BlobHash, number>({ max: 200 })
  /** Get delta chain count */
  private async getDeltaCount(hash: BlobHash): Promise<number> {
    const cached = this.deltaChainCountCache.get(hash)
    if (cached != null) {
      return cached
    }

    // if delta doesnt exist return 0
    const id = hash.toBase64()
    const delta = await this._get('delta', id)
    if (delta === null) return 0

    // get count from base and add 1
    const base = Sha256Hash.fromBuffer(delta.slice(0, 32).buffer) as BlobHash
    // chain count is previous + 1
    const count = (await this.getDeltaCount(base)) + 1
    this.deltaChainCountCache.set(hash, count)
    return count
  }

  /** Store a blob value and optionally with the base */
  async set(hash: BlobHash, value: string, base?: BlobHash) {
    if (base) {
      const baseValue = await this.get(base)
      if (baseValue == null) {
        logger.error(`Could not find ${baseValue}`)
        return
      }
      const count = await this.getDeltaCount(base)
      if (count <= MAX_DELTA_CHAIN_COUNT) {
        // Quick estimate of how different the strings are
        const changeEstimate = estimateChangeSize(baseValue, value)

        // If estimated change is too large (>80% different), skip deltize
        if (changeEstimate > 0.8) {
          logger.debug(
            `Skipping deltize, estimated ${(changeEstimate * 100).toFixed(1)}% change`,
          )
        } else {
          const deltaValue = deltize(base, baseValue, value)
          await this._set('delta', hash, deltaValue.buffer as ArrayBuffer)
          return
        }
      }
    }

    const encoder = new TextEncoder()
    await this._set('blobs', hash, encoder.encode(value).buffer)
  }

  private async _set(storeName: StoreName, hash: BlobHash, value: ArrayBuffer) {
    const trans = this.db.transaction(storeName, 'readwrite')
    await new Promise<void>((resolve, reject) => {
      trans.oncomplete = () => {
        resolve()
      }
      trans.onerror = (_e) => {
        reject(new Error(`failed to set value: ${trans.error?.message ?? ''}`))
      }

      const store = trans.objectStore(storeName)

      const out = pako.deflate(value)
      const req = store.add(out, hash.toBase64())
      req.onsuccess = () => {
        resolve()
      }
      req.onerror = (_e) => {
        reject(new Error(`failed to set item: ${req.error?.message ?? ''}`))
      }
    })
  }
}

/**
 * Quickly estimate how much two strings differ (0 = identical, 1 = completely different)
 * Uses fast heuristics: length difference, common prefix/suffix, and sampling
 */
function estimateChangeSize(base: string, value: string): number {
  if (base === value) return 0
  if (base.length === 0 || value.length === 0) return 1

  const maxLen = Math.max(base.length, value.length)
  const minLen = Math.min(base.length, value.length)

  // 1. Length difference gives lower bound on change
  const lengthDiff = Math.abs(base.length - value.length)
  const lengthScore = lengthDiff / maxLen

  // 2. Find common prefix length
  let prefixLen = 0
  const checkLen = Math.min(minLen, 1000) // Only check first 1000 chars for speed
  for (let i = 0; i < checkLen; i++) {
    if (base[i] === value[i]) {
      prefixLen++
    } else {
      break
    }
  }

  // 3. Find common suffix length (check last 1000 chars)
  let suffixLen = 0
  const suffixCheckLen = Math.min(minLen - prefixLen, 1000)
  for (let i = 1; i <= suffixCheckLen; i++) {
    if (base[base.length - i] === value[value.length - i]) {
      suffixLen++
    } else {
      break
    }
  }

  // Common content (as fraction of total)
  const commonLen = prefixLen + suffixLen
  const commonScore = 1 - commonLen / maxLen

  // Return the maximum of the two scores (most pessimistic estimate)
  return Math.max(lengthScore, commonScore)
}

/**
 * Encodes delta operations into a binary format using fast-diff
 * Format:
 * - 32 bytes: base hash
 * - For each operation:
 *   - Copy: [0x00][offset:4][length:4]
 *   - Insert: [0x01][length:4][data:length]
 */
function deltize(baseHash: BlobHash, base: string, value: string): Uint8Array {
  const ops: Array<{
    type: DeltaType
    offset?: number
    length?: number
    data?: Uint8Array
  }> = []

  // Use fast-diff to compute the differences
  // diff returns: [op, text] where op is -1 (delete), 0 (equal), 1 (insert)
  const diffs = diff(base, value)

  let chatOffset = 0

  for (const [op, text] of diffs) {
    switch (op) {
      case -1: {
        // Delete - skip these characters in the base
        chatOffset += text.length
        break
      }
      case 0: {
        // Equal - this is a copy operation
        ops.push({
          type: DeltaType.Copy,
          offset: chatOffset,
          length: text.length,
        })
        chatOffset += text.length
        break
      }
      case 1: {
        // Insert - add new content (op === 1)
        ops.push({
          type: DeltaType.Insert,
          data: new TextEncoder().encode(text),
        })
        break
      }
    }
  }

  // Calculate total size needed
  let bufferByteSize = 32 // base hash 256/8 bytes
  for (const op of ops) {
    if (op.type === DeltaType.Copy) {
      bufferByteSize += 1 + 4 + 4 // type + offset + length
    } else {
      const dataBytes = op.data?.length ?? 0
      bufferByteSize += 1 + 4 + dataBytes // type + length + data
    }
  }

  // Encode into binary format
  const buffer = new Uint8Array(bufferByteSize)
  const view = new DataView(buffer.buffer)
  let offset = 0

  // Write base hash (BlobHash is a Sha256Hash which has a .hash property)
  buffer.set(new Uint8Array(baseHash.hash), offset)
  offset += 32

  // Write operations
  for (const op of ops) {
    if (op.type === DeltaType.Copy) {
      buffer[offset++] = DeltaType.Copy
      view.setUint32(offset, op.offset!, true) // little-endian
      offset += 4
      view.setUint32(offset, op.length!, true)
      offset += 4
    } else {
      buffer[offset++] = DeltaType.Insert
      const data = op.data!
      view.setUint32(offset, data.length, true)
      offset += 4
      buffer.set(data, offset)
      offset += data.length
    }
  }

  return buffer
}

type Delta = {
  base: BlobHash
  ops: DeltaOperation[]
}
type DeltaOperation =
  | {
      type: DeltaType.Copy
      /** Character offset */
      offset: number
      /** Character length */
      length: number
    }
  | { type: DeltaType.Insert; data: string }

enum DeltaType {
  Copy = 0,
  Insert = 1,
}
/** Convert a base with a delta to the full original blob */
function dedeltize(data: Uint8Array): Delta {
  const base = Sha256Hash.fromBuffer(data.slice(0, 32).buffer) as BlobHash
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  const ops: DeltaOperation[] = []
  let offset = 32
  while (offset < data.length) {
    const type = data[offset++]
    if (type === DeltaType.Copy) {
      const copyOffset = view.getUint32(offset, true)
      offset += 4
      const length = view.getUint32(offset, true)
      offset += 4

      ops.push({ type, offset: copyOffset, length })
    } else if (type === DeltaType.Insert) {
      const length = view.getUint32(offset, true)
      offset += 4
      const textData = data.subarray(offset, offset + length)
      const text = new TextDecoder().decode(textData)
      offset += length

      ops.push({ type, data: text })
    }
  }

  return {
    base,
    ops,
  }
}
