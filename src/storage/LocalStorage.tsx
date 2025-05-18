import { Refs, refSchema } from '../vcs/Refs'

export type LocalStorageKey = 'settings' | 'refs'

class LocalStorage {
  set(id: 'settings', item: any): void
  set(id: 'refs', item: Refs): void
  set(id: LocalStorageKey, item: any) {
    if (id === 'refs')
      return globalThis.localStorage.setItem(id, JSON.stringify(item.getRefs()))

    globalThis.localStorage.setItem(id, JSON.stringify(item))
  }

  get(id: 'settings'): void
  get(id: 'refs'): Refs
  get(id: LocalStorageKey): any | null {
    const v = globalThis.localStorage.getItem(id)
    if (v === null) return null

    if (id === 'refs') {
      return new Refs(refSchema.array().parse(JSON.parse(v)))
    }
    return JSON.parse(v)
  }
}

export const localStorage = new LocalStorage()
