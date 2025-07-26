import { editorEvents } from '../events/events'
import { createContextLogger } from '../logs/logger'
import { Bookmarks, bookmarkSchema, bookmarkToJson } from '../vcs/Bookmarks'
import { LocalStorageKey, StorageValue } from './StorageKey'

const logger = createContextLogger('local-storage')
class LocalStorage {
  set<K extends LocalStorageKey>(key: K, value: StorageValue<K>): void {
    logger.trace(`Storing ${key} ${JSON.stringify(value)}`)
    if (key === 'bookmarks') {
      const bms = value as Bookmarks
      return globalThis.localStorage.setItem(
        key,
        JSON.stringify(bms.getBookmarks().map(bookmarkToJson)),
      )
    }

    globalThis.localStorage.setItem(key, JSON.stringify(value))
    editorEvents.emit('local-storage', { key, value })
  }

  get<K extends LocalStorageKey>(key: K): StorageValue<K> | null {
    const value = globalThis.localStorage.getItem(key)
    if (value === null) return null

    if (key === 'bookmarks') {
      return new Bookmarks(
        bookmarkSchema.array().parse(JSON.parse(value)),
      ) as StorageValue<K>
    }
    return JSON.parse(value) as StorageValue<K>
  }
}

export const localStorage = new LocalStorage()
