import { describe, test, expect, beforeEach } from 'vitest'
import { BlobStorage } from './BlobStorage'
import { Sha256Hash } from '../Sha256Hash'
import { BlobHash } from '../vcs/Commit'

// Mock IndexedDB

// Helper to convert IDBValidKey to string
function keyToString(key: IDBValidKey | undefined): string {
  if (key === undefined) return ''
  if (typeof key === 'string' || typeof key === 'number') return String(key)
  if (key instanceof Date) return key.toISOString()
  if (key instanceof ArrayBuffer) {
    return new Uint8Array(key).join(',')
  }
  if (ArrayBuffer.isView(key)) {
    return Array.from(new Uint8Array(key.buffer)).join(',')
  }
  if (Array.isArray(key)) return JSON.stringify(key)
  return String(key)
}

class MockIDBRequest implements IDBRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any
  error: DOMException | null = null
  source: IDBObjectStore | IDBIndex | IDBCursor = null!
  transaction: IDBTransaction = null!
  readyState: IDBRequestReadyState = 'pending'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onsuccess: ((this: IDBRequest, ev: Event) => any) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((this: IDBRequest, ev: Event) => any) | null = null

  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions,
  ): void {}
  removeEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions,
  ): void {}
  dispatchEvent(_event: Event): boolean {
    return true
  }
}

class MockIDBTransaction implements IDBTransaction {
  db: IDBDatabase = null!
  error: DOMException | null = null
  mode: IDBTransactionMode = 'readonly'
  objectStoreNames: DOMStringList = null!
  durability: IDBTransactionDurability = 'default'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oncomplete: ((this: IDBTransaction, ev: Event) => any) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((this: IDBTransaction, ev: Event) => any) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onabort: ((this: IDBTransaction, ev: Event) => any) | null = null

  private readonly storeNames: string[]
  private readonly storeData: Map<string, Map<string, Uint8Array>>

  constructor(
    storeNames: string[],
    mode: IDBTransactionMode = 'readonly',
    storeData: Map<string, Map<string, Uint8Array>>,
  ) {
    this.mode = mode
    this.storeNames = storeNames
    this.storeData = storeData

    // Auto-complete transaction after microtask
    setTimeout(() => {
      this.oncomplete?.(new Event('complete'))
    }, 0)
  }

  objectStore(name: string): IDBObjectStore {
    if (!this.storeNames.includes(name)) {
      throw new Error(`Object store ${name} not found`)
    }
    return new MockIDBObjectStore(name, this, this.storeData) as IDBObjectStore
  }

  abort(): void {}
  commit(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true
  }
}

class MockIDBObjectStore implements IDBObjectStore {
  name: string
  keyPath: string | string[] = ''
  indexNames: DOMStringList = null!
  transaction: IDBTransaction
  autoIncrement: boolean = false

  private readonly data: Map<string, Uint8Array>

  constructor(
    name: string,
    transaction: IDBTransaction,
    storeData: Map<string, Map<string, Uint8Array>>,
  ) {
    this.name = name
    this.transaction = transaction

    // Get or create the data map for this store
    if (!storeData.has(name)) {
      storeData.set(name, new Map<string, Uint8Array>())
    }
    this.data = storeData.get(name)!
  }
  add(value: Uint8Array, key?: IDBValidKey): IDBRequest {
    const req = new MockIDBRequest()
    const keyStr = keyToString(key)

    setTimeout(() => {
      if (this.data.has(keyStr)) {
        req.error = new DOMException('Key already exists', 'ConstraintError')
        req.readyState = 'done'
        req.onerror?.(new Event('error'))
      } else {
        this.data.set(keyStr, value)
        req.result = key
        req.readyState = 'done'
        req.onsuccess?.(new Event('success'))
      }
    }, 0)

    return req as IDBRequest
  }

  get(key: IDBValidKey): IDBRequest {
    const req = new MockIDBRequest()
    const keyStr = keyToString(key)

    setTimeout(() => {
      req.result = this.data.get(keyStr)
      req.readyState = 'done'
      req.onsuccess?.(new Event('success'))
    }, 0)

    return req as IDBRequest
  }

  put(value: Uint8Array, key?: IDBValidKey): IDBRequest {
    const req = new MockIDBRequest()
    const keyStr = keyToString(key)

    setTimeout(() => {
      this.data.set(keyStr, value)
      req.result = key
      req.readyState = 'done'
      req.onsuccess?.(new Event('success'))
    }, 0)

    return req as IDBRequest
  }

  delete(_key: IDBValidKey | IDBKeyRange): IDBRequest {
    const req = new MockIDBRequest()
    return req as IDBRequest
  }

  clear(): IDBRequest {
    const req = new MockIDBRequest()
    this.data.clear()
    return req as IDBRequest
  }

  count(_query?: IDBValidKey | IDBKeyRange): IDBRequest {
    return new MockIDBRequest() as IDBRequest
  }

  getAll(
    _query?: IDBValidKey | IDBKeyRange | null,
    _count?: number,
  ): IDBRequest {
    return new MockIDBRequest() as IDBRequest
  }

  getAllKeys(
    _query?: IDBValidKey | IDBKeyRange | null,
    _count?: number,
  ): IDBRequest {
    return new MockIDBRequest() as IDBRequest
  }

  getKey(_query: IDBValidKey | IDBKeyRange): IDBRequest {
    return new MockIDBRequest() as IDBRequest
  }

  openCursor(
    _query?: IDBValidKey | IDBKeyRange | null,
    _direction?: IDBCursorDirection,
  ): IDBRequest {
    return new MockIDBRequest() as IDBRequest
  }

  openKeyCursor(
    _query?: IDBValidKey | IDBKeyRange | null,
    _direction?: IDBCursorDirection,
  ): IDBRequest {
    return new MockIDBRequest() as IDBRequest
  }

  index(_name: string): IDBIndex {
    throw new Error('Not implemented')
  }

  createIndex(
    _name: string,
    _keyPath: string | string[],
    _options?: IDBIndexParameters,
  ): IDBIndex {
    throw new Error('Not implemented')
  }

  deleteIndex(_name: string): void {}
}

class MockIDBDatabase implements IDBDatabase {
  name: string = 'test-db'
  version: number = 1

  objectStoreNames: DOMStringList = null!
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onabort: ((this: IDBDatabase, ev: Event) => any) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onclose: ((this: IDBDatabase, ev: Event) => any) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((this: IDBDatabase, ev: Event) => any) | null = null

  onversionchange: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((this: IDBDatabase, ev: IDBVersionChangeEvent) => any) | null = null

  // Shared storage for all object stores
  private readonly storeData: Map<string, Map<string, Uint8Array>> = new Map()

  transaction(
    storeNames: string | string[],
    mode?: IDBTransactionMode,
    _options?: IDBTransactionOptions,
  ): IDBTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames]
    // Create a new transaction each time (BlobStorage doesn't reuse them)
    return new MockIDBTransaction(names, mode, this.storeData)
  }

  close(): void {}
  createObjectStore(
    _name: string,
    _options?: IDBObjectStoreParameters,
  ): IDBObjectStore {
    throw new Error('Not implemented')
  }
  deleteObjectStore(_name: string): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true
  }
}

describe('BlobStorage', () => {
  let db: MockIDBDatabase
  let storage: BlobStorage

  // Helper to create a BlobHash from a string
  const createHash = async (str: string): Promise<BlobHash> => {
    return (await Sha256Hash.create(str)) as BlobHash
  }

  beforeEach(() => {
    db = new MockIDBDatabase()

    storage = new BlobStorage(db as IDBDatabase)
  })

  describe('Basic Blob Storage', () => {
    test('should store and retrieve a blob', async () => {
      const hash = await createHash('test-hash-1')
      const content = 'Hello, World!'

      await storage.set(hash, content)
      const retrieved = await storage.get(hash)

      expect(retrieved).toBe(content)
    })

    test('should return null for non-existent blob', async () => {
      const hash = await createHash('non-existent')
      const result = await storage.get(hash)

      expect(result).toBeNull()
    })

    test('should store and retrieve large blobs', async () => {
      const hash = await createHash('large-blob')
      const content = 'x'.repeat(100000) // 100KB of data

      await storage.set(hash, content)
      const retrieved = await storage.get(hash)

      expect(retrieved).toBe(content)
    })

    test('should handle special characters in blobs', async () => {
      const hash = await createHash('special-chars')
      const content = 'Hello 👋 \n\t\r Special chars: 你好 🎉'

      await storage.set(hash, content)
      const retrieved = await storage.get(hash)

      expect(retrieved).toBe(content)
    })

    test('should store empty string', async () => {
      const hash = await createHash('empty')
      const content = ''

      await storage.set(hash, content)
      const retrieved = await storage.get(hash)

      expect(retrieved).toBe(content)
    })
  })

  describe('Delta Storage', () => {
    test('should store and retrieve delta-based blob', async () => {
      const baseHash = await createHash('base-1')
      const deltaHash = await createHash('delta-1')
      const baseContent = 'The quick brown fox jumps over the lazy dog'
      const deltaContent = 'The quick brown fox jumps over the lazy cat'

      // Store base first
      await storage.set(baseHash, baseContent)

      // Store delta
      await storage.set(deltaHash, deltaContent, baseHash)

      // Retrieve delta
      const retrieved = await storage.get(deltaHash)

      expect(retrieved).toBe(deltaContent)
    })

    test('should handle multiple deltas in a chain', async () => {
      const hash1 = await createHash('chain-1')
      const hash2 = await createHash('chain-2')
      const hash3 = await createHash('chain-3')

      const content1 = 'Line 1\nLine 2\nLine 3'
      const content2 = 'Line 1\nLine 2 modified\nLine 3'
      const content3 = 'Line 1\nLine 2 modified\nLine 3\nLine 4'

      await storage.set(hash1, content1)
      await storage.set(hash2, content2, hash1)
      await storage.set(hash3, content3, hash2)

      const retrieved = await storage.get(hash3)
      expect(retrieved).toBe(content3)
    })

    test('should handle insertions in delta', async () => {
      const baseHash = await createHash('insert-base')
      const deltaHash = await createHash('insert-delta')
      const baseContent = 'Hello World'
      const deltaContent = 'Hello Beautiful World'

      await storage.set(baseHash, baseContent)
      await storage.set(deltaHash, deltaContent, baseHash)

      const retrieved = await storage.get(deltaHash)
      expect(retrieved).toBe(deltaContent)
    })

    test('should handle deletions in delta', async () => {
      const baseHash = await createHash('delete-base')
      const deltaHash = await createHash('delete-delta')
      const baseContent = 'Hello Beautiful World'
      const deltaContent = 'Hello World'

      await storage.set(baseHash, baseContent)
      await storage.set(deltaHash, deltaContent, baseHash)

      const retrieved = await storage.get(deltaHash)
      expect(retrieved).toBe(deltaContent)
    })

    test('should handle mixed operations in delta', async () => {
      const baseHash = await createHash('mixed-base')
      const deltaHash = await createHash('mixed-delta')
      const baseContent = 'function foo() {\n  console.log("hello");\n}'
      const deltaContent =
        'function bar() {\n  console.log("world");\n  return 42;\n}'

      await storage.set(baseHash, baseContent)
      await storage.set(deltaHash, deltaContent, baseHash)

      const retrieved = await storage.get(deltaHash)
      expect(retrieved).toBe(deltaContent)
    })

    test('should store as blob when delta chain is too long', async () => {
      // Create a chain longer than MAX_DELTA_CHAIN_COUNT (50)
      const hashes: BlobHash[] = []
      for (let i = 0; i < 52; i++) {
        hashes.push(await createHash(`long-chain-${i}`))
      }

      // Store first blob
      await storage.set(hashes[0]!, 'content-0')

      // Create a long chain
      for (let i = 1; i < 51; i++) {
        await storage.set(hashes[i]!, `content-${i}`, hashes[i - 1])
      }

      // The 51st item should be stored as a full blob, not a delta
      await storage.set(hashes[51]!, 'content-51', hashes[50])

      const retrieved = await storage.get(hashes[51]!)
      expect(retrieved).toBe('content-51')
    })

    test('should return null if base is missing', async () => {
      const baseHash = await createHash('missing-base')
      const deltaHash = await createHash('orphan-delta')

      // Try to store delta without base
      await storage.set(deltaHash, 'content', baseHash)

      // Should not be able to retrieve it
      const retrieved = await storage.get(deltaHash)
      // This will fail because base doesn't exist
      expect(retrieved).toBeNull()
    })
  })

  describe('Delta Chain Management', () => {
    test('should cache delta chain counts', async () => {
      const hash1 = await createHash('cache-1')
      const hash2 = await createHash('cache-2')
      const hash3 = await createHash('cache-3')

      await storage.set(hash1, 'content-1')
      await storage.set(hash2, 'content-2', hash1)
      await storage.set(hash3, 'content-3', hash2)

      // Access multiple times - should use cache
      await storage.get(hash3)
      await storage.get(hash3)
      await storage.get(hash3)

      // Verify cache has the value
      expect(storage.deltaChainCountCache.has(hash2)).toBe(true)
    })
  })

  describe('Bloom Filter', () => {
    test('should use bloom filter to optimize delta lookups', async () => {
      const baseHash = await createHash('bloom-base')
      const deltaHash = await createHash('bloom-delta')

      await storage.set(baseHash, 'base content')
      await storage.set(deltaHash, 'delta content', baseHash)

      // First access should populate bloom filter
      await storage.get(deltaHash)

      // Bloom filter should now contain this hash
      expect(storage.deltaFilter.test(deltaHash.toBase64())).toBe(true)
    })

    test('should handle false positives in bloom filter', async () => {
      const hash = await createHash('false-positive')

      // Add to bloom filter without storing
      storage.deltaFilter.add(hash.toBase64())

      // Should still return null since blob doesn't exist
      const result = await storage.get(hash)
      expect(result).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    test('should handle unicode characters in deltas', async () => {
      const baseHash = await createHash('unicode-base')
      const deltaHash = await createHash('unicode-delta')
      const baseContent = 'Hello 世界'
      const deltaContent = 'Hello 世界! 👋'

      await storage.set(baseHash, baseContent)
      await storage.set(deltaHash, deltaContent, baseHash)

      const retrieved = await storage.get(deltaHash)
      expect(retrieved).toBe(deltaContent)
    })

    test('should handle newlines and whitespace', async () => {
      const baseHash = await createHash('whitespace-base')
      const deltaHash = await createHash('whitespace-delta')
      const baseContent = 'Line 1\n\nLine 2\t\tLine 3'
      const deltaContent = 'Line 1\n\nLine 2 Modified\t\tLine 3'

      await storage.set(baseHash, baseContent)
      await storage.set(deltaHash, deltaContent, baseHash)

      const retrieved = await storage.get(deltaHash)
      expect(retrieved).toBe(deltaContent)
    })

    test('should handle complete replacement', async () => {
      const baseHash = await createHash('replace-base')
      const deltaHash = await createHash('replace-delta')
      const baseContent = 'This is the old content'
      const deltaContent = 'This is completely new content'

      await storage.set(baseHash, baseContent)
      await storage.set(deltaHash, deltaContent, baseHash)

      const retrieved = await storage.get(deltaHash)
      expect(retrieved).toBe(deltaContent)
    })
  })

  describe('Compression', () => {
    test('should compress stored data', async () => {
      const hash = await createHash('compress-test')
      // Create highly compressible content
      const content = 'a'.repeat(10000)

      await storage.set(hash, content)
      const retrieved = await storage.get(hash)

      expect(retrieved).toBe(content)
    })
  })
})
