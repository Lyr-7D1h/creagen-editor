import { ID } from '../vcs/id'
import { Refs, refSchema } from '../vcs/Refs'
import { LocalStorageKey, StorageValueType } from './StorageKey'

export function isLocalStorageKey(key: string | ID): key is LocalStorageKey {
  if (key instanceof ID) return false
  return [
    'menu',
    'menu-current-view',
    'settings',
    'refs',
    'active-ref',
  ].includes(key)
}

class LocalStorage {
  set<K extends LocalStorageKey>(id: K, item: StorageValueType<K>): void {
    if (id === 'refs') {
      const refs = item as Refs
      return globalThis.localStorage.setItem(id, JSON.stringify(refs.getRefs()))
    }

    globalThis.localStorage.setItem(id, JSON.stringify(item))
  }

  get<K extends LocalStorageKey>(id: K): StorageValueType<K> | null {
    const v = globalThis.localStorage.getItem(id)
    if (v === null) return null

    if (id === 'active-ref')
      return refSchema.parse(JSON.parse(v)) as StorageValueType<K>
    if (id === 'refs') {
      return new Refs(
        refSchema.array().parse(JSON.parse(v)),
      ) as StorageValueType<K>
    }
    return JSON.parse(v) as StorageValueType<K>
  }
}

export const localStorage = new LocalStorage()
