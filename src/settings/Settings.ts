import type {
  DefaultSettingsConfig,
  Entry,
  SettingsParam,
  ParamKey,
  ParamValue} from './SettingsConfig';
import {
  DEFAULT_SETTINGS_CONFIG
} from './SettingsConfig'
import { editorEvents } from '../events/events'
import { createContextLogger } from '../logs/logger'
import type { ClientStorage } from '../creagen-editor/CreagenEditor'

export const logger = createContextLogger('settings')

export function parentKey(key: string) {
  return key.split('.').slice(0, -1).join('.')
}

async function getStoredSettings(
  storage: ClientStorage,
): Promise<Record<ParamKey, Entry>> {
  // Initialize with deep cloned default settings
  const config = (
    Object.entries(DEFAULT_SETTINGS_CONFIG) as Array<[ParamKey, Entry]>
  ).reduce(
    (acc, [key, entry]) => {
      acc[key] = {
        ...entry,
      }
      return acc
    },
    {} as Record<ParamKey, Entry>,
  )

  // Load stored settings from localStorage
  const storedSettings = await storage.getSettings()

  if (typeof storedSettings !== 'object' || storedSettings === null)
    return config

  for (const [key, value] of Object.entries(storedSettings)) {
    if (!(key in config)) continue

    const entry = config[key as ParamKey]
    if (entry.type !== 'param' || typeof entry.value !== typeof value) continue

    if (typeof value === 'boolean' || typeof value === 'number') {
      entry.value = value
    }
  }

  return config
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

// Core Settings class to handle the settings logic
export class Settings {
  config: DefaultSettingsConfig

  private readonly storage: ClientStorage

  private constructor(storage: ClientStorage, config: DefaultSettingsConfig) {
    this.storage = storage
    this.config = config
  }

  static async create(storage: ClientStorage) {
    const config = await getStoredSettings(storage)

    return new Settings(storage, config as DefaultSettingsConfig)
  }

  get values(): Record<ParamKey, unknown> {
    return Object.fromEntries(
      (Object.entries(this.config) as Array<[ParamKey, Entry]>).flatMap(
        ([key, entry]) =>
          entry.type === 'param' ? [[key, entry.value] as const] : [],
      ),
    ) as Record<ParamKey, unknown>
  }

  isParam(key: string): key is ParamKey {
    if (key in this.config) {
      const entry = this.config[key as keyof DefaultSettingsConfig]
      return entry.type === 'param'
    }
    return false
  }

  getEntry(key: string): Readonly<Entry> | null {
    const entry = this.config[key as keyof DefaultSettingsConfig]
    if (typeof entry === 'undefined') return null
    return entry as Entry
  }

  get<P extends ParamKey>(key: P): ParamValue<P> {
    return (this.config[key] as SettingsParam).value as ParamValue<P>
  }

  // Set a value
  set(key: ParamKey, value: unknown): void {
    const entry = this.config[key]
    if (typeof entry === 'undefined') throw Error(`Key ${key} does not exist`)
    if (typeof entry.validate !== 'undefined') {
      const e = entry.validate(value as never)
      if (typeof e === 'string') {
        logger.error(e)
        return
      }
    }
    if (typeof value !== 'object' && entry.value === value) return
    logger.trace(`setting ${key} to ${JSON.stringify(value)}`)
    const oldValue = entry.value
    entry.value = value as typeof entry.value
    this.saveAndNotify(key, value, oldValue)
  }

  // Remove an entry and its children
  remove(key: ParamKey): void {
    if (
      typeof (DEFAULT_SETTINGS_CONFIG as DefaultSettingsConfig)[
        key as keyof DefaultSettingsConfig
      ] !== 'undefined'
    )
      throw Error(`You can't remove ${key} as this is a system setting`)
    const newSettings: Record<string, unknown> = { ...this.config }
    for (const k in newSettings) {
      if (k.startsWith(key)) {
        delete newSettings[k]
      }
    }
    this.config = newSettings as DefaultSettingsConfig
    this.saveAndNotify(key, null)
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
}
