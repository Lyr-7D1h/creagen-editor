import { editorEvents } from '../events/events'
import { createContextLogger } from '../logs/logger'
import { Refs, refSchema, refToJson } from '../vcs/Refs'
import { LocalStorageKey, StorageValue } from './StorageKey'

const logger = createContextLogger('local-storage')
class LocalStorage {
  set<K extends LocalStorageKey>(key: K, value: StorageValue<K>): void {
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

  get<K extends LocalStorageKey>(key: K): StorageValue<K> | null {
    const value = globalThis.localStorage.getItem(key)
    if (value === null) return null

    if (key === 'refs') {
      return new Refs(
        refSchema.array().parse(JSON.parse(value)),
      ) as StorageValue<K>
    }
    return JSON.parse(value) as StorageValue<K>
  }
}

export const localStorage = new LocalStorage()
