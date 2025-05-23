import { Storage } from './Storage'
import { logger } from '../logs/logger'
import { generationSchema } from '../vcs/Generation'
import { localStorage } from './LocalStorage'
import { StorageKey } from './Storage'

interface StoredGeneration {
  code: string
  createdOn: number
  previous?: string
}

export class ClientStorage extends Storage {
  db: IDBDatabase | null

  constructor() {
    super()
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

  async set(id: StorageKey, item: any) {
    console.debug(`[ClientStorage] Storing ${id} ${JSON.stringify(item)}`)
    if (id === 'refs') {
      return localStorage.set('refs', item)
    } else if (id === 'settings') {
      return localStorage.set('settings', item)
    }

    // return on duplicate values
    if ((await this.get(id)) !== null) return

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
      const req = store.add(storedItem, id.toString())
      req.onsuccess = () => {
        resolve()
      }
    })
  }

  async get(id: StorageKey): Promise<any | null> {
    if (id === 'refs') return localStorage.get(id)
    if (id === 'settings') return localStorage.get(id)

    const db = await this.load()
    const os = db.transaction('generations').objectStore('generations')
    const req = os.get(id.toString())
    return await new Promise((resolve, reject) => {
      req.onsuccess = () => {
        if (typeof req.result === 'undefined') return resolve(null)
        const gen = generationSchema.parse(req.result)
        resolve(gen)
      }
      req.onerror = (_e) => {
        reject(new Error(`failed to get item: ${req.error?.message ?? ''}`))
      }
    })
  }
}
