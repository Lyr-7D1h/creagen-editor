import { CustomKeybinding } from '../creagen-editor/keybindings'

/** LocalStorage */
export type LocalStorageOnlyKey =
  | 'welcome'
  | 'menu-view'
  | 'menu-view-tab'
  | 'menu-settings-hidden'
  | 'control-panel-tab'
  | 'control-panel-open'
  | 'control-panel-maximized'
  | 'control-panel-position'
  | 'control-panel-size'
/** LocalStorage + Remote */
export type LocalStorageKey =
  | 'editor-scroll-position'
  | 'custom-keybindings'
  | 'settings'
  | 'bookmarks'
  | LocalStorageOnlyKey
/** IndexDB + Remote */
/** Any key used for storage */

type LocalStorageKeyValueMap = {
  welcome: boolean
  'menu-view': boolean
  'menu-view-tab': string
  'menu-settings-hidden': string[]
  'editor-scroll-position': number
  'control-panel-tab': number
  'control-panel-open': boolean
  'control-panel-maximized': boolean
  'control-panel-position': { x: number; y: number }
  'control-panel-size': { width: number; height: number }
  'custom-keybindings': CustomKeybinding[]
  blob: string
  settings: unknown
}
export type LocalStorageValue<K extends LocalStorageKey> =
  K extends keyof LocalStorageKeyValueMap ? LocalStorageKeyValueMap[K] : never
