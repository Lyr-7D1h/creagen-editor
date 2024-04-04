import { type ID } from './id'

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
