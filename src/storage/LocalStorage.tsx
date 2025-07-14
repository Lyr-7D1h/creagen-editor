import { editorEvents } from '../events/events'
import { Refs, refSchema } from '../vcs/Refs'
import { LocalStorageKey, StorageValueType } from './StorageKey'

class LocalStorage {
  set<K extends LocalStorageKey>(key: K, value: StorageValueType<K>): void {
    if (key === 'refs') {
      const refs = value as Refs
      return globalThis.localStorage.setItem(
        key,
        JSON.stringify(refs.getRefs()),
      )
    }

    globalThis.localStorage.setItem(key, JSON.stringify(value))
    editorEvents.emit('local-storage', { key, value })
  }

  get<K extends LocalStorageKey>(key: K): StorageValueType<K> | null {
    const value = globalThis.localStorage.getItem(key)
    if (value === null) return null

    if (key === 'active-ref')
      return refSchema.parse(JSON.parse(value)) as StorageValueType<K>
    if (key === 'refs') {
      return new Refs(
        refSchema.array().parse(JSON.parse(value)),
      ) as StorageValueType<K>
    }
    return JSON.parse(value) as StorageValueType<K>
  }
}

export const localStorage = new LocalStorage()
