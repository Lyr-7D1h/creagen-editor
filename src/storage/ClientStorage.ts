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
import { BlobHash, Commit, commitSchema } from '../vcs/Commit'
import { BlobStorage } from './BlobStorage'

const logger = createContextLogger('indexdb')

export const COMMITS_STORE = 'commits'
export const BLOB_STORE = 'blobs'
export const DELTA_STORE = 'delta'

/** Entry point for fetching all data */
export class ClientStorage {
  private readonly blobStorage: BlobStorage
  private constructor(private readonly db: IDBDatabase) {
    this.blobStorage = new BlobStorage(db)
  }

  static async create(): Promise<ClientStorage> {
    return await new Promise((resolve, reject) => {
      // Make storage persistent https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria#does_browser-stored_data_persist
      navigator.storage
        .persisted()
        .then((persisted) => {
          // if not already persisted set it (asks for permission in firefox)
          if (!persisted) {
            navigator.storage
              .persist()
              .then((persistent) => {
                if (persistent) {
                  logger.info('Commits will be persisted in local storage')
                } else {
                  logger.warn('Commits might be cleared from local storage')
                }
              })
              .catch(logger.error)
          }
        })
        .catch(logger.error)

      const req = indexedDB.open('creagen', 2)
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

        const oldVersion = event.oldVersion
        if (oldVersion < 1) {
          const os = db.createObjectStore(COMMITS_STORE)
          os.createIndex('blob', 'blob')
          os.createIndex('editorVersion', 'editorVersion')
          os.createIndex('libraries', 'libraries')
          os.createIndex('parent', 'parent')
          os.createIndex('author', 'author')
          db.createObjectStore(BLOB_STORE)
        }

        if (oldVersion < 2) {
          db.createObjectStore(DELTA_STORE)
        }
      }
    })
  }

  private async _set(storeName: string, id: string, value: unknown) {
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

  async set(
    key: 'blob',
    item: string,
    hash: BlobHash,
    base?: BlobHash,
  ): Promise<void>
  async set<K extends StorageKey>(
    key: K,
    item: StorageValue<K>,
    ...args: K extends IndexDbKey
      ? [hash: StorageIdentifier<K>, base?: BlobHash]
      : []
  ): Promise<void>
  async set<K extends StorageKey>(
    key: K,
    item: StorageValue<K>,
    ...args: K extends IndexDbKey
      ? [hash: StorageIdentifier<K>, base?: BlobHash]
      : []
  ) {
    if (isLocalStorageKey(key)) {
      return localStorage.set(key, item)
    }

    if (!isIndexDbKey(key)) return

    // don't set if already exists
    // call get with concrete key variants to satisfy TypeScript's overloads
    if (key === 'commit') {
      const identifier = args[0] as unknown as StorageIdentifier<'commit'>
      if ((await this.get('commit', identifier)) !== null) return
    } else {
      const identifier = args[0] as unknown as StorageIdentifier<'blob'>
      if ((await this.get('blob', identifier)) !== null) return
    }

    if (key === 'commit') {
      const identifier = args[0]!
      const commit = item as Commit
      await this._set(COMMITS_STORE, identifier.toHex(), commit.toJson())
    }
    if (key === 'blob') {
      const identifier = args[0]! as BlobHash
      const base = args[1]
      const blob = item as string
      await this.blobStorage.set(identifier, blob, base)
    }
  }

  private async _get(storeName: string, identifier: string) {
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
      const commit = await this._get(COMMITS_STORE, identifier.toHex())
      if (commit === null) return null
      return (await commitSchema.parseAsync(commit)) as StorageValue<K>
    }
    if (key === 'blob') {
      const blob = await this.blobStorage.get(args[0]! as BlobHash)
      if (blob === null) return null
      return blob as StorageValue<K>
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

  /** import indexdb data */
  async import(data: {
    commits: Array<{ key: string; value: unknown }>
    blobs: Array<{ key: string; value: unknown }>
  }) {
    // Validate all commits asynchronously first
    const validatedCommits: Array<{ key: string; value: unknown }> = []
    for (const { key, value } of data.commits) {
      try {
        // Validate the commit structure asynchronously
        await commitSchema.parseAsync(value)
        validatedCommits.push({ key, value })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        logger.warn(`Skipping invalid commit during import: ${error}`)
      }
    }

    const trans = this.db.transaction([COMMITS_STORE, BLOB_STORE], 'readwrite')

    return await new Promise<void>((resolve, reject) => {
      trans.oncomplete = () => {
        logger.info(
          `Imported ${validatedCommits.length} commits and ${data.blobs.length} blobs`,
        )
        resolve()
      }
      trans.onerror = (_e) => {
        reject(
          new Error(`Import transaction failed: ${trans.error?.message ?? ''}`),
        )
      }

      const commitsStore = trans.objectStore(COMMITS_STORE)
      const blobsStore = trans.objectStore(BLOB_STORE)

      // Import validated commits
      for (const { key, value } of validatedCommits) {
        commitsStore.put(value, key)
      }

      // Import blobs
      for (const { key, value } of data.blobs) {
        if (typeof value !== 'string') {
          logger.warn('Skipping invalid blob during import')
          continue
        }
        blobsStore.put(value, key)
      }
    })
  }

  /** export indexdb data */
  async export() {
    const storeNames = [COMMITS_STORE, BLOB_STORE]

    const [commits, blobs] = await Promise.all(
      storeNames.map((storeName) => {
        const t = this.db.transaction(storeName, 'readonly')
        return new Promise<Array<{ key: string; value: unknown }>>(
          (resolve, reject) => {
            t.onerror = (_e) => {
              reject(
                new Error(
                  `Export transaction failed: ${t.error?.message ?? ''}`,
                ),
              )
            }
            const store = t.objectStore(storeName)
            const req = store.openCursor()
            const results: Array<{ key: string; value: unknown }> = []

            req.onsuccess = () => {
              const cursor = req.result
              if (cursor) {
                // Convert key to string
                let keyStr: string
                const key = cursor.key
                if (typeof key === 'string') {
                  keyStr = key
                } else if (typeof key === 'number') {
                  keyStr = key.toString()
                } else {
                  keyStr = JSON.stringify(key)
                }

                results.push({
                  key: keyStr,
                  value: cursor.value,
                })
                cursor.continue()
              } else {
                // No more entries
                resolve(results)
              }
            }

            req.onerror = (_e) => {
              reject(new Error(`Export failed ${req.error?.message ?? ''}`))
            }
          },
        )
      }),
    )

    return { commits, blobs }
  }
}
