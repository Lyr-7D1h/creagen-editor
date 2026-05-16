import type { ClientStorage } from '../creagen-editor/CreagenEditor'
import { createContextLogger } from '../logs/logger'
import type {
  SettingsConfigKey,
  SettingsEntry,
  SettingsEntryType,
} from './SettingsConfig'
import { isSettingsConfigKey, SETTINGS_CONFIG } from './SettingsConfig'

export const logger = createContextLogger('settings')

export function parentKey(key: string) {
  return key.split('.').slice(0, -1).join('.')
}

type SettingsStore = {
  [K in SettingsConfigKey]: SettingsEntryType<K>
}
async function getSettingsStore(
  storage: ClientStorage,
): Promise<SettingsStore> {
  // Load stored settings
  const storedSettings = await storage.getSettings()

  // return only default values
  if (typeof storedSettings !== 'object' || storedSettings === null)
    return Object.fromEntries(
      Object.entries(SETTINGS_CONFIG).map(([k, v]) => [k, v.default]),
    ) as SettingsStore

  const res = {} as Record<SettingsConfigKey, unknown>
  for (const [key, entry] of Object.entries(SETTINGS_CONFIG)) {
    const defaultValue = entry.default
    if (!isSettingsConfigKey(key)) continue
    if (
      key in storedSettings &&
      typeof storedSettings[key] === typeof defaultValue
    ) {
      // check validation
      if ('validate' in entry) {
        const validation = entry.validate(storedSettings[key] as never)
        if (typeof validation === 'string') {
          logger.warn(`Failed to validate stored setting ${key}: ${validation}`)
          res[key] = defaultValue
          continue
        }
      }

      res[key] = storedSettings[key]
    } else {
      res[key] = defaultValue
    }
  }

  return res as SettingsStore
}

export interface SettingsContextType {
  /** Do not change unknown of these values use `set()` and `add()` */
  readonly store: SettingsStore
  set: (key: SettingsConfigKey, value: unknown) => void
  add: (key: string, entry: SettingsEntry) => void
  /** Remove all values under this key */
  remove: (key: string) => void
}

export type SettingsChangedEvent = {
  [K in SettingsConfigKey]: {
    key: K
    value: SettingsEntryType<K>
    oldValue?: SettingsEntryType<K>
  }
}[SettingsConfigKey]

/**
 * Core Settings class to handle the settings logic
 *
 * Uses per-key events for efficiency:
 * - `on(key, callback)` listens to the setting key directly as the event type
 * - `onAny(callback)` listens to the general `settings:changed` event
 * - When a setting changes, both events are dispatched
 * - This ensures specific listeners only fire when their key changes
 */
export class Settings {
  private readonly target = new EventTarget()

  private constructor(
    private readonly storage: ClientStorage,
    private store: SettingsStore,
  ) {}

  static async create(storage: ClientStorage) {
    const store = await getSettingsStore(storage)

    return new Settings(storage, store)
  }

  /**
   * Listen for a specific setting change
   * @param key The setting key to listen for
   * @param callback Called when the specified setting changes
   * @param opts Event listener options
   * @returns A cleanup function to remove the event listener
   */
  on<K extends SettingsConfigKey>(
    key: K,
    callback: (
      value: SettingsEntryType<K>,
      oldValue?: SettingsEntryType<K>,
    ) => void,
    opts?: AddEventListenerOptions,
  ): () => void {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          value: SettingsEntryType<K>
          oldValue?: SettingsEntryType<K>
        }>
      ).detail
      callback(detail.value, detail.oldValue)
    }

    this.target.addEventListener(key, handler, opts)
    return () => {
      this.target.removeEventListener(key, handler)
    }
  }

  /**
   * Listen for any settings changes
   * @param callback Called when any setting changes
   * @param opts Event listener options
   * @returns A cleanup function to remove the event listener
   */
  onAny(
    callback: (data: SettingsChangedEvent) => void,
    opts?: AddEventListenerOptions,
  ): () => void {
    const handler = (e: Event) => {
      callback((e as CustomEvent<SettingsChangedEvent>).detail)
    }

    this.target.addEventListener('settings:changed', handler, opts)
    return () => {
      this.target.removeEventListener('settings:changed', handler)
    }
  }

  get values(): SettingsStore {
    return this.store
  }

  isSettingsKey(key: string): key is SettingsConfigKey {
    return isSettingsConfigKey(key)
  }

  getConfig<K extends SettingsConfigKey>(
    key: K,
  ): Readonly<(typeof SETTINGS_CONFIG)[K]> {
    return SETTINGS_CONFIG[key]
  }

  get<K extends SettingsConfigKey>(key: K): SettingsEntryType<K> {
    return this.store[key]
  }

  // Set a value
  set<K extends SettingsConfigKey>(key: K, value: SettingsEntryType<K>): void {
    const configEntry = SETTINGS_CONFIG[key]
    if (typeof configEntry === 'undefined')
      throw Error(`Key ${key} does not exist`)

    if ('validate' in configEntry) {
      const e = configEntry.validate(value as never)
      if (typeof e === 'string') {
        logger.error(e)
        return
      }
    }

    const stored = this.store[key]
    if (typeof value !== 'object' && stored === value) return
    logger.trace(`setting ${key} to ${JSON.stringify(value)}`)
    ;(this.store as Record<K, SettingsEntryType<K>>)[key] = value
    this.saveAndNotify(key, value, stored)
  }

  // Save settings to localStorage and notify listeners
  private saveAndNotify<K extends SettingsConfigKey>(
    key: K,
    value: SettingsEntryType<K>,
    oldValue?: SettingsEntryType<K>,
  ): void {
    this.storage.setSettings(this.values).catch(logger.error)

    // Emit specific key event
    this.target.dispatchEvent(
      new CustomEvent(key, {
        detail: { value, oldValue },
      }),
    )

    // Emit general settings changed event for onAny listeners
    this.target.dispatchEvent(
      new CustomEvent('settings:changed', {
        detail: {
          key,
          value,
          oldValue,
        } as SettingsChangedEvent,
      }),
    )
  }
}
