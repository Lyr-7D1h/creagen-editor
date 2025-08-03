import { BlobHash, Commit, CommitHash } from '../vcs/Commit'
import { TabKey } from '../editor/Menu'
import { Bookmarks } from '../vcs/Bookmarks'
import { CustomKeybinding } from '../creagen-editor/keybindings'

const LOCAL_STORAGE_KEYS: LocalStorageKey[] = [
  'welcome',
  'menu-view',
  'menu-view-tab',
  'menu-settings-hidden',
  'custom-keybindings',
  'settings',
  'bookmarks',
]
export function isLocalStorageKey(key: StorageKey): key is LocalStorageKey {
  return LOCAL_STORAGE_KEYS.includes(key as LocalStorageKey)
}

const INDEX_DB_KEYS: IndexDbKey[] = ['blob', 'commit']
export function isIndexDbKey(key: StorageKey): key is IndexDbKey {
  return INDEX_DB_KEYS.includes(key as IndexDbKey)
}

/** LocalStorage */
export type LocalStorageOnlyKey =
  | 'welcome'
  | 'menu-view'
  | 'menu-view-tab'
  | 'menu-settings-hidden'
/** LocalStorage + Remote */
export type LocalStorageKey =
  | 'custom-keybindings'
  | 'settings'
  | 'bookmarks'
  | LocalStorageOnlyKey
/** IndexDB + Remote */
export type IndexDbKey = 'commit' | 'blob'
/** Any key used for storage */
export type StorageKey = LocalStorageKey | IndexDbKey

type StorageIdentifierMap = {
  commit: CommitHash
  blob: BlobHash
}
export type StorageIdentifier<K extends StorageKey> =
  K extends keyof StorageIdentifierMap ? StorageIdentifierMap[K] : undefined

type StorageKeyValueMap = {
  welcome: boolean
  'menu-view': boolean
  'menu-view-tab': TabKey | null
  'menu-settings-hidden': string[]
  'custom-keybindings': CustomKeybinding[]
  commit: Commit
  blob: string
  settings: any
  bookmarks: Bookmarks
}
export type StorageValue<K extends StorageKey> =
  K extends keyof StorageKeyValueMap ? StorageKeyValueMap[K] : never
