import { ID } from '../vcs/id'
import { TabKey } from '../editor/Menu'
import { Generation } from '../vcs/Generation'
import { Ref, Refs } from '../vcs/Refs'

/** These keys can only be used in local storage */
export type LocalStorageOnlyKey = 'menu-current-view' | 'menu-enabled'
export type LocalStorageKey =
  | 'active-ref'
  | 'settings'
  | 'refs'
  | LocalStorageOnlyKey
export type StorageKey = ID | LocalStorageKey

export type StorageKeyValueMap = {
  'active-ref': Ref
  'menu-enabled': boolean
  'menu-current-view': TabKey
  settings: any
  refs: Refs
}

export type StorageValueType<K extends StorageKey> =
  K extends keyof StorageKeyValueMap
    ? StorageKeyValueMap[K]
    : K extends ID
      ? Generation
      : never
