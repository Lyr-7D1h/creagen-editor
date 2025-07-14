import { ID } from '../vcs/id'
import { TabKey } from '../editor/Menu'
import { Generation } from '../vcs/Generation'
import { Ref, Refs } from '../vcs/Refs'
import { CustomKeybinding } from '../creagen-editor/keybindings'

export const LOCAL_STORAGE_KEYS: LocalStorageKey[] = [
  'menu-view',
  'menu-view-tab',
  'custom-keybindings',
  'active-ref',
  'settings',
  'refs',
]
export function isLocalStorageKey(key: string | ID): key is LocalStorageKey {
  if (key instanceof ID) return false
  return LOCAL_STORAGE_KEYS.includes(key as LocalStorageKey)
}

/** These keys can only be used in local storage */
export type LocalStorageOnlyKey = 'menu-view' | 'menu-view-tab'
export type LocalStorageKey =
  | 'custom-keybindings'
  | 'active-ref'
  | 'settings'
  | 'refs'
  | LocalStorageOnlyKey
export type StorageKey = ID | LocalStorageKey

export type StorageKeyValueMap = {
  'active-ref': Ref
  'menu-view': boolean
  'menu-view-tab': TabKey | null
  'custom-keybindings': CustomKeybinding[]
  settings: any
  refs: Refs
}

export type StorageValueType<K extends StorageKey> =
  K extends keyof StorageKeyValueMap
    ? StorageKeyValueMap[K]
    : K extends ID
      ? Generation
      : never
