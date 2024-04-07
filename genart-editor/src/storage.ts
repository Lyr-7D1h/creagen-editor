import { IDToString, type ID } from './id'

// TODO: look into indexed db https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

export interface Code {
  code: string
}

export class LocalStorage {
  set(id: ID, item: Code) {
    localStorage.setItem(id.hash, JSON.stringify(item))
  }

  get(id: ID): Code | null {
    const v = localStorage.getItem(id.hash)
    if (v === null) return null
    return JSON.parse(v)
  }
}

export class IndexDB {
  db: IDBDatabase | null

  constructor() {
    this.db = null
  }

  private async load(): Promise<IDBDatabase> {
    return await new Promise((resolve, reject) => {
      if (this.db !== null) {
        resolve(this.db)
        return
      }
      const req = indexedDB.open('genart', 1)
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
        const db = event.target.result as IDBDatabase

        db.onerror = () => {
          reject(new Error('failed to upgrade index db'))
        }

        const os = db.createObjectStore('code')
        os.createIndex('code', 'code', { unique: false })
      }
    })
  }

  async set(id: ID, item: Code) {
    const db = await this.load()
    const trans = db.transaction('code', 'readwrite')
    await new Promise<void>((resolve, reject) => {
      trans.oncomplete = () => {
        resolve()
      }
      trans.onerror = (_e) => {
        reject(new Error(`failed to set value: ${trans.error?.message ?? ''}`))
      }

      const store = trans.objectStore('code')
      const req = store.add(item, IDToString(id))
      req.onsuccess = () => {
        resolve()
      }
    })
  }

  async get(id: ID): Promise<Code | null> {
    const db = await this.load()
    const os = db.transaction('code').objectStore('code')
    const req = os.get(IDToString(id))
    return await new Promise((resolve, reject) => {
      req.onsuccess = () => {
        resolve((req.result as Code | undefined) ?? null)
      }
      req.onerror = (_e) => {
        reject(new Error(`failed to get item: ${req.error?.message ?? ''}`))
      }
    })
  }
}
