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

export type Listener = (value: any) => void

// Core Settings class to handle the settings logic
export class Settings {
  config: DefaultSettingsConfig
  private listeners: Map<string | null, Listener[]> = new Map()

  constructor() {
    // Initialize with default settings
    const defaultConfig = { ...defaultSettingsConfig } as Record<string, any>

    // Load stored settings from localStorage
    const storageSettings = localStorage.get('settings')
    if (storageSettings !== null) {
      for (const [key, value] of Object.entries(storageSettings)) {
        const entry = defaultConfig[key]
        // skip if current stored has changed
        if (
          typeof entry === 'undefined' ||
          typeof entry !== typeof value ||
          entry.type !== (value as any).type
        )
          continue
        defaultConfig[key] = {
          ...(defaultConfig[key] ?? {}),
          ...(value as any),
        }
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

  get(key: Params): any {
    return this.config[key].value
  }

  // Set a value
  set(key: Params, value: any): void {
    const entry = this.config[key]
    if (entry.type !== 'param')
      throw Error(`You can't set a value for ${entry.type}`)
    entry.value = value
    this.saveAndNotify()

    this.listeners.get(key)?.forEach((listener) => listener(entry))
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
    this.saveAndNotify()
    return key as keyof DefaultSettingsConfig
  }

  // Remove an entry and its children
  remove(key: string): void {
    const newSettings: Record<string, any> = { ...this.config }
    for (const k in newSettings) {
      if (k.startsWith(key)) {
        delete newSettings[k]
      }
    }
    this.config = newSettings as DefaultSettingsConfig
    this.saveAndNotify()
  }

  // Save settings to localStorage and notify listeners
  private saveAndNotify(): void {
    // Remove generated settings before saving
    const clone = { ...this.config }
    const saveSettings = Object.fromEntries(
      Object.entries(clone).filter(([_, value]) => !(value as Entry).generated),
    ) as DefaultSettingsConfig

    localStorage.set('settings', saveSettings)

    // Notify all listeners
    this.listeners.get(null)?.forEach((listener) => listener(null))
  }

  // Add a change listener
  subscribe(listener: () => void, key?: string): () => void {
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
