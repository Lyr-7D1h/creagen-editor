import { editorEvents } from '../events/events'
import { createContextLogger } from '../logs/logger'
import type { LocalStorageKey, LocalStorageValue } from './StorageKey'

const logger = createContextLogger('local-storage')
class LocalStorage {
  set<K extends LocalStorageKey>(key: K, value: LocalStorageValue<K>): void {
    logger.trace(`Storing ${key} ${JSON.stringify(value)}`)

    globalThis.localStorage.setItem(key, JSON.stringify(value))
    editorEvents.emit('local-storage', { key, value })
  }

  get<K extends LocalStorageKey>(key: K): LocalStorageValue<K> | null {
    const value = globalThis.localStorage.getItem(key)
    if (value === null) return null

    return JSON.parse(value) as LocalStorageValue<K>
  }

  remove<K extends LocalStorageKey>(key: K): void {
    logger.trace(`Removing ${key}`)
    globalThis.localStorage.removeItem(key)
    editorEvents.emit('local-storage', { key, value: null })
  }
}

export const localStorage = new LocalStorage()
