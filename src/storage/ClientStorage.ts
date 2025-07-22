import { isLocalStorageKey, StorageKey, StorageValueType } from './StorageKey'
import { createContextLogger } from '../logs/logger'
import { generationSchema } from '../vcs/Generation'
import { localStorage } from './LocalStorage'

interface StoredGeneration {
  code: string
  createdOn: number
  previous?: string
}

const logger = createContextLogger('indexdb')
export class ClientStorage {
  db: IDBDatabase | null

  constructor() {
    this.db = null
  }

  private async load(): Promise<IDBDatabase> {
    if (this.db !== null) {
      return this.db
    }

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
                  logger.info('Generations will be persisted in local storage')
                } else {
                  logger.warn('Generations might be cleared from local storage')
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
        this.db = req.result
        resolve(req.result)
      }
      req.onupgradeneeded = (event) => {
        if (event.target === null) return
        if (!('result' in event.target)) return
        const db = event.target.result as IDBDatabase

        db.onerror = () => {
          reject(new Error('failed to upgrade index db'))
        }

        const os = db.createObjectStore('generations')
        os.createIndex('code', 'code')
        os.createIndex('createdOn', 'createdOn')
        os.createIndex('previous', 'previous')
      }
    })
  }

  async set<K extends StorageKey>(
    key: K,
    item: StorageValueType<K>,
  ): Promise<void>
  async set(key: StorageKey, item: any): Promise<void> {
    if (isLocalStorageKey(key)) {
      return localStorage.set(key, item)
    }
    logger.debug(`Storing ${key} ${JSON.stringify(item)}`)

    // return on duplicate values
    if ((await this.get(key)) !== null) return

    const db = await this.load()
    const trans = db.transaction('generations', 'readwrite')
    await new Promise<void>((resolve, reject) => {
      trans.oncomplete = () => {
        resolve()
      }
      trans.onerror = (_e) => {
        reject(new Error(`failed to set value: ${trans.error?.message ?? ''}`))
      }

      const store = trans.objectStore('generations')
      const storedItem: StoredGeneration = {
        code: item.code,
        createdOn: item.createdOn.valueOf(),
        previous: item.previous?.toString(),
      }
      const req = store.add(storedItem, key.toString())
      req.onsuccess = () => {
        resolve()
      }
    })
  }

  async get<K extends StorageKey>(key: K): Promise<StorageValueType<K> | null> {
    if (isLocalStorageKey(key)) {
      return Promise.resolve(localStorage.get(key))
    }

    const db = await this.load()
    const os = db.transaction('generations').objectStore('generations')
    const req = os.get(key.toString())
    return await new Promise((resolve, reject) => {
      req.onsuccess = () => {
        if (typeof req.result === 'undefined') return resolve(null)
        const gen = generationSchema.parse(req.result)
        resolve(gen as StorageValueType<K>)
      }
      req.onerror = (_e) => {
        reject(new Error(`failed to get item: ${req.error?.message ?? ''}`))
      }
    })
  }
}
