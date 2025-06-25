import { ID } from '../vcs/id'
import { Ref, Refs, refSchema } from '../vcs/Refs'
import { StorageKey } from './Storage'

export type LocalStorageKey =
  | 'menu-current-view'
  | 'settings'
  | 'refs'
  | 'active-ref'

export function isLocalStorageKey(key: StorageKey): key is LocalStorageKey {
  if (key instanceof ID) return false
  return true
}

class LocalStorage {
  set(id: 'active-ref', item: Ref): void
  set(id: 'settings', item: any): void
  set(id: 'refs', item: Refs): void
  set(id: LocalStorageKey, item: any): void
  set(id: LocalStorageKey, item: any) {
    if (id === 'refs')
      return globalThis.localStorage.setItem(id, JSON.stringify(item.getRefs()))

    globalThis.localStorage.setItem(id, JSON.stringify(item))
  }

  get(id: 'settings'): void
  get(id: 'refs'): Refs
  get(id: LocalStorageKey): any
  get(id: LocalStorageKey): any | null {
    const v = globalThis.localStorage.getItem(id)
    if (v === null) return null

    if (id === 'active-ref') return refSchema.parse(JSON.parse(v))
    if (id === 'refs') {
      return new Refs(refSchema.array().parse(JSON.parse(v)))
    }
    return JSON.parse(v)
  }
}

export const localStorage = new LocalStorage()
