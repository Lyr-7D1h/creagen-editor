import { StorageKey, StorageValue } from './StorageKey'
import { localStorage } from './LocalStorage'

export const COMMITS_STORE = 'commits'
export const BLOB_STORE = 'blobs'
export const DELTA_STORE = 'delta'

/** Entry point for fetching all data */
export class ClientStorage {
  set<K extends StorageKey>(key: K, item: StorageValue<K>) {
    return localStorage.set(key, item)
  }

  get<K extends StorageKey>(key: K): StorageValue<K> | null {
    return localStorage.get(key)
  }
}
