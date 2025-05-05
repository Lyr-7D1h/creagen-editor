import { z } from 'zod'
import { IDStringSchema, type ID } from '../creagen-editor/id'
import { logger } from '../logs/logger'
import { dateNumberSchema } from '../creagen-editor/schemaUtils'

export abstract class Storage {
  abstract set(id: ID, item: Generation): Promise<void>

  abstract get(id: ID): Promise<Generation | null>
}

interface StoredGeneration {
  code: string
  createdOn: number
  previous?: string
}
const generationSchema = z.object({
  code: z.string(),
  createdOn: dateNumberSchema,
  previous: IDStringSchema.optional(),
})
export type Generation = z.infer<typeof generationSchema>

export class IndexDB extends Storage {
  db: IDBDatabase | null

  constructor() {
    super()
    this.db = null
  }

  private async load(): Promise<IDBDatabase> {
    return await new Promise((resolve, reject) => {
      if (this.db !== null) {
        resolve(this.db)
        return
      }

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

  async set(id: ID, item: Generation) {
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

  async get(id: ID): Promise<Generation | null> {
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
