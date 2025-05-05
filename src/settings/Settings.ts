import { localStorage } from '../storage/localStorage'
import {
  defaultSettingsConfig,
  DefaultSettingsConfig,
  Entry,
  Param,
  Params,
} from './SettingsConfig'

export function parentKey(key: string) {
  return key.split('.').slice(0, -1).join('.')
}

export interface SettingsContextType {
  /** Do not change any of these values use `set()` and `add()` */
  values: Record<Params, any>
  /** Do not change any of these values use `set()` and `add()` */
  config: DefaultSettingsConfig
  set: (key: Params, value: any) => void
  add: (key: string, entry: Entry) => void
  /** Remove all values under this key */
  remove: (key: string) => void
}

/** If value is null it means something has been removed/added or the value has been set to null */
export type Listener = (value: any | null, key: string) => void
export type KeyListener = (value: any | null) => void
export type KeyParamListener = (value: any) => void

// Core Settings class to handle the settings logic
export class Settings {
  readonly defaultConfig = defaultSettingsConfig
  config: DefaultSettingsConfig
  /** Listeners listening to all events located at null */
  private listeners: Map<string | null, Listener[]> = new Map()

  constructor() {
    // Initialize with deep cloned default settings
    const defaultConfig = Object.entries(defaultSettingsConfig).reduce<
      Record<string, any>
    >((acc, [key, entry]) => {
      acc[key] = {
        ...entry,
      }
      return acc
    }, {})

    // Load stored settings from localStorage
    const storageSettings = localStorage.get('settings')
    if (storageSettings !== null) {
      for (const [key, value] of Object.entries(storageSettings)) {
        const entry = defaultConfig[key]
        // skip if current stored has changed
        if (
          typeof entry === 'undefined' ||
          typeof entry.value !== typeof value ||
          entry.type !== 'param'
        )
          continue
        defaultConfig[key].value = value
      }
    }

    this.config = defaultConfig as DefaultSettingsConfig
  }

  get values(): Record<Params, any> {
    return Object.fromEntries(
      Object.entries(this.config)
        .filter(([_, entry]) => (entry as Entry).type === 'param' || entry.type)
        .map(([key, entry]) => [key, (entry as Param).value]),
    ) as Record<Params, any>
  }

  isParam(key: string): key is Params {
    if (key in this.config) {
      const entry = this.config[key as keyof DefaultSettingsConfig]
      return entry.type === 'param'
    }
    return false
  }

  getEntry(key: string): Entry | null {
    const entry = this.config[key as keyof DefaultSettingsConfig]
    if (typeof entry === 'undefined') return null
    return entry as Entry
  }

  get(key: Params): any {
    return this.config[key].value
  }

  // Set a value
  set(key: Params, value: any): void {
    console.debug(`Settings: setting ${key} to ${JSON.stringify(value)}`)
    const entry = this.config[key]
    if (typeof entry === 'undefined') throw Error(`Key ${key} does not exist`)
    if (entry.type !== 'param')
      throw Error(`You can't set a value for ${entry.type}`)
    entry.value = value
    this.saveAndNotify(key, value)
  }

  // Add a new entry
  add(key: string, entry: Entry) {
    if (
      entry.type === 'param' &&
      (this.config[parentKey(key) as keyof DefaultSettingsConfig] as Entry)
        ?.type !== 'folder'
    ) {
      throw Error('parent is not a folder')
    }

    this.config[key as keyof DefaultSettingsConfig] = entry as any
    ;(this.config[key as keyof DefaultSettingsConfig] as Entry).generated = true
    this.saveAndNotify(key, null)
    return key as keyof DefaultSettingsConfig
  }

  // Remove an entry and its children
  remove(key: string): void {
    if (
      typeof (defaultSettingsConfig as DefaultSettingsConfig)[
        key as keyof DefaultSettingsConfig
      ] !== 'undefined'
    )
      throw Error(`You can't remove ${key} as this is a system setting`)
    const newSettings: Record<string, any> = { ...this.config }
    for (const k in newSettings) {
      if (k.startsWith(key)) {
        delete newSettings[k]
      }
    }
    this.config = newSettings as DefaultSettingsConfig
    this.saveAndNotify(key, null)
  }

  // Save settings to localStorage and notify listeners
  private saveAndNotify(key: any, value: any | null): void {
    const values = { ...this.values }
    for (const k in values) {
      const entry = this.config[k as Params] as Entry
      if (entry.generated) {
        delete values[k as Params]
      }
    }
    localStorage.set('settings', values)

    // Notify all listeners
    this.listeners.get(null)?.forEach((listener) => listener(value, key))
    if (value !== null) {
      this.listeners.get(key)?.forEach((listener) => listener(value, key))
    }
  }

  // Add a change listener and return a function to unsubscribe
  subscribe(listener: KeyListener, key: string): () => void
  subscribe(listener: KeyParamListener, key: Params): () => void
  subscribe(listener: Listener): () => void
  subscribe(listener: Listener, key?: string): () => void {
    const index = key ?? null
    let listeners = this.listeners.get(index)
    if (typeof listeners === 'undefined') {
      listeners = [] as Listener[]
    }
    listeners.push(listener)
    this.listeners.set(index, listeners)

    return () => {
      this.listeners.set(
        index,
        listeners!.filter((l) => l !== listener),
      )
    }
  }
}
