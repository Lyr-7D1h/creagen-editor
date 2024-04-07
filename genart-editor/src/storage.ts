import { type ID } from './id'

// TODO: look into indexed db https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

export interface Item {
  code: string
}

export class LocalStorage {
  store(id: ID, item: Item) {
    localStorage.setItem(id.hash, JSON.stringify(item))
  }

  load(id: ID): Item | null {
    const v = localStorage.getItem(id.hash)
    if (v === null) return null
    return JSON.parse(v)
  }
}
