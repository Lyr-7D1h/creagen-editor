import lzString from 'lz-string'
import {
  IndexDbKey,
  isIndexDbKey,
  isLocalStorageKey,
  StorageIdentifier,
  StorageKey,
  StorageValue,
} from './StorageKey'
import { createContextLogger } from '../logs/logger'
import { localStorage } from './LocalStorage'
import { Commit, commitSchema } from '../vcs/Commit'
import z from 'zod'

const logger = createContextLogger('indexdb')

const COMMITS_STORE = 'commits'
const BLOB_STORE = 'blobs'
export class ClientStorage {
  private constructor(private readonly db: IDBDatabase) {}

  static async create(): Promise<ClientStorage> {
    return await new Promise((resolve, reject) => {
      // Make storage persistent https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria#does_browser-stored_data_persist
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage
          .persisted()
          .then((persisted) => {
            // if not already persisted set it (asks for permission in firefox)
            if (!persisted) {
              navigator.storage.persist().then((persistent) => {
                if (persistent) {
                  logger.info('Commits will be persisted in local storage')
                } else {
                  logger.warn('Commits might be cleared from local storage')
                }
              })
            }
          })
          .catch(logger.error)
      }

      const req = indexedDB.open('creagen', 1)
      req.onerror = (_e) => {
        reject(
          new Error(`failed to open index db: ${req.error?.message ?? ''}`),
        )
      }
      req.onsuccess = () => {
        resolve(new ClientStorage(req.result))
      }
      req.onupgradeneeded = (event) => {
        if (event.target === null) return
        if (!('result' in event.target)) return
        const db = event.target.result as IDBDatabase

        db.onerror = () => {
          reject(new Error('failed to upgrade index db'))
        }

        const os = db.createObjectStore(COMMITS_STORE)
        os.createIndex('blob', 'blob')
        os.createIndex('editorVersion', 'editorVersion')
        os.createIndex('libraries', 'libraries')
        os.createIndex('parent', 'parent')
        os.createIndex('author', 'author')

        db.createObjectStore(BLOB_STORE)
      }
    })
  }

  private async innerSet(storeName: string, id: string, value: any) {
    logger.trace(`Storing ${id} ${JSON.stringify(value)}`)
    const trans = this.db.transaction(storeName, 'readwrite')
    await new Promise<void>((resolve, reject) => {
      trans.oncomplete = () => {
        resolve()
      }
      trans.onerror = (_e) => {
        reject(new Error(`failed to set value: ${trans.error?.message ?? ''}`))
      }

      const store = trans.objectStore(storeName)
      const req = store.add(value, id.toString())
      req.onsuccess = () => {
        resolve()
      }
      req.onerror = (_e) => {
        reject(new Error(`failed to set item: ${req.error?.message ?? ''}`))
      }
    })
  }

  async set<K extends StorageKey>(
    key: K,
    item: StorageValue<K>,
    ...args: K extends IndexDbKey ? [identifier: StorageIdentifier<K>] : []
  ) {
    if (isLocalStorageKey(key)) {
      return localStorage.set(key, item)
    }

    if (!isIndexDbKey(key)) return

    // don't set if already exists
    if ((await this.get(key, ...(args as any))) !== null) return

    if (key === 'commit') {
      const identifier = args[0]!
      const commit = item as Commit
      await this.innerSet(COMMITS_STORE, identifier.toHex(), commit.toJson())
    }
    if (key === 'blob') {
      const identifier = args[0]!
      await this.innerSet(
        BLOB_STORE,
        identifier.toHex(),
        lzString.compressToUTF16(item),
      )
    }
  }

  private async innerGet(storeName: string, identifier: string) {
    const trans = this.db.transaction(storeName)
    return await new Promise((resolve, reject) => {
      trans.onerror = (_e) => {
        reject(new Error(`failed to set value: ${trans.error?.message ?? ''}`))
      }
      const store = trans.objectStore(storeName)
      const req = store.get(identifier)
      req.onsuccess = () => {
        if (typeof req.result === 'undefined') return resolve(null)
        resolve(req.result)
      }
      req.onerror = (_e) => {
        reject(new Error(`failed to get item: ${req.error?.message ?? ''}`))
      }
    })
  }

  async get<K extends StorageKey>(
    key: K,
    ...args: K extends IndexDbKey ? [identifier: StorageIdentifier<K>] : []
  ): Promise<StorageValue<K> | null> {
    if (isLocalStorageKey(key)) {
      return Promise.resolve(localStorage.get(key))
    }

    if (key === 'commit') {
      const identifier = args[0]!
      const commit = await this.innerGet(COMMITS_STORE, identifier.toHex())
      if (commit === null) return null
      return (await commitSchema.parseAsync(commit)) as StorageValue<K>
    }
    if (key === 'blob') {
      const identifier = args[0]!
      const blob = await this.innerGet(BLOB_STORE, identifier.toHex())
      if (blob === null) return null
      return lzString.decompressFromUTF16(
        z.string().parse(blob),
      ) as StorageValue<K>
    }

    return null
  }

  async getAllCommits(): Promise<Commit[]> {
    const trans = this.db.transaction(COMMITS_STORE, 'readonly')
    return await new Promise((resolve, reject) => {
      trans.onerror = (_e) => {
        reject(
          new Error(`failed to get all commits: ${trans.error?.message ?? ''}`),
        )
      }
      const store = trans.objectStore(COMMITS_STORE)
      const req = store.getAll()
      req.onsuccess = async () => {
        try {
          const commits = await Promise.all(
            req.result.map((c) => commitSchema.parseAsync(c)),
          )
          resolve(commits)
        } catch (e) {
          reject(e as Error)
        }
      }
      req.onerror = (_e) => {
        reject(
          new Error(`failed to get all commits: ${req.error?.message ?? ''}`),
        )
      }
    })
  }
}
