import { Storage } from '../storage/Storage'
import {
  defaultSettingsConfig,
  DefaultSettingsConfig,
  Entry,
  Param,
  ParamKey,
} from './SettingsConfig'
import { editorEvents } from '../events/events'

export function parentKey(key: string) {
  return key.split('.').slice(0, -1).join('.')
}

export interface SettingsContextType {
  /** Do not change any of these values use `set()` and `add()` */
  values: Record<ParamKey, any>
  /** Do not change any of these values use `set()` and `add()` */
  config: DefaultSettingsConfig
  set: (key: ParamKey, value: any) => void
  add: (key: string, entry: Entry) => void
  /** Remove all values under this key */
  remove: (key: string) => void
}

// Core Settings class to handle the settings logic
export class Settings {
  readonly defaultConfig = defaultSettingsConfig
  config: DefaultSettingsConfig

  private storage: Storage

  private constructor(storage: Storage, config: DefaultSettingsConfig) {
    this.storage = storage
    this.config = config
  }

  static async create(storage: Storage) {
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
    const storageSettings = await storage.get('settings')
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

    return new Settings(storage, defaultConfig as DefaultSettingsConfig)
  }

  get values(): Record<ParamKey, any> {
    return Object.fromEntries(
      Object.entries(this.config)
        .filter(([_, entry]) => (entry as Entry).type === 'param' || entry.type)
        .map(([key, entry]) => [key, (entry as Param).value]),
    ) as Record<ParamKey, any>
  }

  isParam(key: string): key is ParamKey {
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

  get(key: ParamKey): any {
    return this.config[key].value
  }

  // Set a value
  set(key: ParamKey, value: any): void {
    console.debug(`[Settings] setting ${key} to ${JSON.stringify(value)}`)
    const entry = this.config[key]
    if (typeof entry === 'undefined') throw Error(`Key ${key} does not exist`)
    if (entry.type !== 'param')
      throw Error(`You can't set a value for ${entry.type}`)
    const oldValue = entry.value
    entry.value = value
    this.saveAndNotify(key, value, oldValue)
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
  private saveAndNotify(key: any, value: any | null, oldValue?: any): void {
    const values = { ...this.values }
    for (const k in values) {
      const entry = this.config[k as ParamKey] as Entry
      if (entry.generated) {
        delete values[k as ParamKey]
      }
    }
    this.storage.set('settings', values)

    // Emit settings changed event
    editorEvents.emit('settings:changed', { key, value, oldValue })
  }
}
