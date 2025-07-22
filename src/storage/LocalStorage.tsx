import { editorEvents } from '../events/events'
import { createContextLogger } from '../logs/logger'
import { Refs, refSchema, refToJson } from '../vcs/Refs'
import { LocalStorageKey, StorageValueType } from './StorageKey'

const logger = createContextLogger('local-storage')
class LocalStorage {
  set<K extends LocalStorageKey>(key: K, value: StorageValueType<K>): void {
    logger.trace(`Storing ${key} ${JSON.stringify(value)}`)
    if (key === 'refs') {
      const refs = value as Refs
      return globalThis.localStorage.setItem(
        key,
        JSON.stringify(refs.getRefs().map(refToJson)),
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
