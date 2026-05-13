import type { ClientStorage } from '../creagen-editor/CreagenEditor'
import { editorEvents } from '../events/events'
import { createContextLogger } from '../logs/logger'
import { deepEqual } from '../util'
import type {
  DefaultSettingsConfig,
  Entry,
  ParamKey,
  ParamValue,
  SettingConfig,
  ValueFromConfig,
} from './SettingsConfig'
import { DEFAULT_SETTINGS_CONFIG } from './SettingsConfig'

export const logger = createContextLogger('settings')

export function parentKey(key: string) {
  return key.split('.').slice(0, -1).join('.')
}

async function loadStoredSettings(
  storage: ClientStorage,
  store: Map<string, unknown>,
  configs: Map<string, SettingConfig>,
): Promise<void> {
  const storedSettings = await storage.getSettings()

  if (typeof storedSettings !== 'object' || storedSettings === null) return

  for (const [key, value] of Object.entries(storedSettings)) {
    const config = configs.get(key)
    if (!config || config.type === 'folder' || config.type === 'button')
      continue

    // Validate stored value against config
    if (Settings.isValidValue(config, value)) {
      store.set(key, value)
    }
  }
}

export interface SettingsContextType {
  /** Do not change unknown of these values use `set()` and `add()` */
  values: Record<ParamKey, unknown>
  /** Do not change unknown of these values use `set()` and `add()` */
  config: DefaultSettingsConfig
  set: (key: ParamKey, value: unknown) => void
  add: (key: string, entry: Entry) => void
  /** Remove all values under this key */
  remove: (key: string) => void
}

export type AllSettings = Array<[string, SettingConfig, unknown]>

// Core Settings class to handle the settings logic (similar to Params class)
export class Settings {
  private previousStore: Map<string, unknown> = new Map()
  private previousConfigs: Map<string, SettingConfig> = new Map()
  readonly store: Map<string, unknown> = new Map()
  readonly configs: Map<string, SettingConfig> = new Map()
  private readonly storage: ClientStorage

  private constructor(storage: ClientStorage) {
    this.storage = storage
    // Initialize with default configs
    for (const [key, config] of Object.entries(DEFAULT_SETTINGS_CONFIG)) {
      if (config.type === 'folder' || config.type === 'button') {
        this.configs.set(key, config as SettingConfig)
      } else {
        this.configs.set(key, config as SettingConfig)
        if ('default' in config) {
          this.store.set(key, config.default)
        }
      }
    }
  }

  static async create(storage: ClientStorage) {
    const settings = new Settings(storage)
    await loadStoredSettings(storage, settings.store, settings.configs)
    return settings
  }

  get config(): DefaultSettingsConfig {
    // Convert to legacy format for backwards compatibility
    const result: Record<string, Entry> = {}
    for (const [key, config] of this.configs.entries()) {
      if (config.type === 'folder' || config.type === 'button') {
        result[key] = config as Entry
      } else {
        const value = this.store.get(key)
        result[key] = { ...config, value } as Entry
      }
    }
    return result as DefaultSettingsConfig
  }

  get values(): Record<ParamKey, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of this.store.entries()) {
      result[key] = value
    }
    return result as Record<ParamKey, unknown>
  }

  get length(): number {
    return this.store.size
  }

  /**
   * Validates that a value meets the constraints of its setting config.
   * Returns true if valid, false otherwise.
   */
  static isValidValue(config: SettingConfig, value: unknown): boolean {
    if (config.type === 'folder' || config.type === 'button') return false

    switch (config.type) {
      case 'boolean':
        return typeof value === 'boolean'

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) return false
        if (typeof config.min !== 'undefined' && value < config.min)
          return false
        if (typeof config.max !== 'undefined' && value > config.max)
          return false
        return true

      case 'string':
        return typeof value === 'string'

      case 'query-param':
      case 'custom':
        // For these types, we allow any value and let validation happen elsewhere
        return true
    }
  }

  isParam(key: string): key is ParamKey {
    const config = this.configs.get(key)
    if (!config) return false
    return config.type !== 'folder' && config.type !== 'button'
  }

  getEntry(key: string): Readonly<Entry> | null {
    const config = this.configs.get(key)
    if (!config) return null

    if (config.type === 'folder' || config.type === 'button') {
      return config as Entry
    }

    const value = this.store.get(key)
    return { ...config, value } as Entry
  }

  get<P extends ParamKey>(key: P): ParamValue<P> {
    return this.store.get(key) as ParamValue<P>
  }

  /** Preserve values before updating configs */
  preserve() {
    this.previousStore = new Map(this.store)
    this.previousConfigs = new Map(this.configs)
  }

  /** Done updating configs, send updates and clear preserve */
  done() {
    const entries = [...this.previousConfigs.entries()]
    for (const [key, previousConfig] of entries) {
      const config = this.configs.get(key)
      if (!config) {
        editorEvents.emit('settings:deleted', { key })
        continue
      }
      if (!deepEqual(config, previousConfig)) {
        editorEvents.emit('settings:config-changed', { key, config })
      }
    }

    this.configs.forEach((config, key) => {
      if (this.previousConfigs.has(key)) return
      editorEvents.emit('settings:config-added', { key, config })
    })

    this.previousConfigs.clear()
    this.previousStore.clear()
  }

  // Set a value
  set(key: ParamKey, value: unknown): void {
    const config = this.configs.get(key)
    if (!config) throw Error(`Key ${key} does not exist`)
    if (config.type === 'folder' || config.type === 'button') {
      throw Error(`Cannot set value for ${config.type} type`)
    }

    // Validate value
    if ('validate' in config && typeof config.validate === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const error = config.validate(value as never) as string | null
      if (typeof error === 'string') {
        logger.error(error)
        return
      }
    }

    // Check if value changed
    const oldValue = this.store.get(key)
    if (typeof value !== 'object' && oldValue === value) return

    // Validate against config constraints
    if (!Settings.isValidValue(config, value)) {
      logger.error(`Invalid value for ${key}: ${JSON.stringify(value)}`)
      return
    }

    logger.trace(`setting ${key} to ${JSON.stringify(value)}`)
    this.store.set(key, value)
    this.saveAndNotify(key, value, oldValue)
  }

  setValue(key: string, value: unknown): void {
    if (!this.store.has(key)) return
    this.set(key as ParamKey, value)
  }

  // Remove an entry and its children
  remove(key: ParamKey): void {
    if (DEFAULT_SETTINGS_CONFIG[key]) {
      throw Error(`You can't remove ${key} as this is a system setting`)
    }

    // Remove this key and all children (keys that start with this key)
    const keysToRemove: string[] = []
    for (const k of this.configs.keys()) {
      if (k === key || k.startsWith(`${key}.`)) {
        keysToRemove.push(k)
      }
    }

    for (const k of keysToRemove) {
      this.configs.delete(k)
      this.store.delete(k)
      editorEvents.emit('settings:deleted', { key: k })
    }

    this.saveAndNotify(key, null)
  }

  /** Add or update a setting config */
  addSetting<T extends SettingConfig>(
    key: string,
    config: T,
  ): ValueFromConfig<T> | undefined {
    if (config.type === 'folder' || config.type === 'button') {
      this.configs.set(key, config)
      return undefined
    }

    const stored = this.store.get(key)
    // Use stored value only if it exists and is valid for the config
    if (stored !== undefined && Settings.isValidValue(config, stored)) {
      this.configs.set(key, config)
      return stored as ValueFromConfig<T>
    }

    const previousValue = this.previousStore.get(key)

    // Use previousValue if valid, otherwise use default
    const value: ValueFromConfig<T> = (
      previousValue !== undefined &&
      Settings.isValidValue(config, previousValue)
        ? previousValue
        : 'default' in config
          ? config.default
          : undefined
    ) as ValueFromConfig<T>

    this.store.set(key, value)
    this.configs.set(key, config)

    return value
  }

  // Save settings to localStorage and notify listeners
  private saveAndNotify(
    key: ParamKey,
    value: unknown,
    oldValue?: unknown,
  ): void {
    this.storage.setSettings(this.values).catch(logger.error)
    // Emit settings changed event
    editorEvents.emit('settings:changed', { key, value, oldValue })
  }

  /** Save current settings to storage */
  save() {
    if (this.length === 0) return
    this.storage.setSettings(this.values).catch(logger.error)
  }
}
