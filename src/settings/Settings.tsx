import React from 'react'
import { localStorage } from '../storage/localStorage'
import { CREAGEN_EDITOR_VERSION, CREAGEN_DEV_VERSION, MODE } from '../env'
import { generateHumanReadableName, roundToDec } from '../util'
import { SemVer } from 'semver'
import { LinearProgressWithLabelSetting } from './LinearProgressWithLabelSetting'

export interface Library {
  name: string
  version: SemVer
}

const defaultAppSettingsConfig = {
  general: {
    type: 'folder',
    title: 'General',
  },
  'general.name': {
    type: 'param',
    label: 'Name',
    value: generateHumanReadableName(),
  },
  'general.libraries': {
    type: 'param',
    label: 'Libraries',
    generated: true,
    value: [] as Library[],
  },
  'general.storage': {
    type: 'param',
    label: 'Available Storage',
    render: ({ current, max }: { current: number; max: number }) => (
      <LinearProgressWithLabelSetting
        minLabel="0GB"
        maxLabel={`${roundToDec(max / 1000000000, 3)}GB`}
        variant="determinate"
        value={roundToDec(current / max, 3)}
      />
    ),
    value: { value: 0, max: 0 },
    generated: true,
    opts: { readonly: true },
  },
  editor: {
    type: 'folder',
    title: 'Editor',
  },
  'editor.format_on_render': {
    type: 'param',
    label: 'Format on render',
    value: false,
  },
  'editor.fullscreen': {
    type: 'param',
    label: 'Fullscreen',
    value: false,
  },
  'editor.vim': {
    type: 'param',
    label: 'Vim',
    value: false,
  },
  'editor.relative_lines': {
    type: 'param',
    label: 'Relative Lines',
    value: false,
  },
  debug: {
    type: 'folder',
    title: 'Debug',
  },
  'debug.mode': {
    type: 'param',
    label: 'Mode',
    value: `${MODE}`,
    opts: {
      readonly: true,
    },
  },
  'debug.package': {
    type: 'param',
    label: 'Package',
    value: `creagen@${CREAGEN_DEV_VERSION}`,
    opts: {
      readonly: true,
    },
  },
  'debug.editor': {
    type: 'param',
    label: 'Editor Version',
    value: `${CREAGEN_EDITOR_VERSION}`,
    opts: {
      readonly: true,
    },
  },
}

export type DefaultAppSettingsConfig = SettingsConfig<
  typeof defaultAppSettingsConfig
>

type Generic<T> = {
  [K in keyof T]: K extends 'type' ? string : T[K]
}
type GenericSettingsConfig = Record<
  string,
  Generic<Param> | Generic<Folder> | Generic<Button>
>
export type SettingsConfig<T extends GenericSettingsConfig> = {
  [K in keyof T]: T[K] extends { value: any }
    ? Param
    : T[K] extends { label: string }
      ? Button
      : Folder
}
type Params<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Param ? K : never
}[keyof T]
type Folders<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Folder ? K : never
}[keyof T]
type Buttons<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Button ? K : never
}[keyof T]

type SettingsConfigKeys = keyof DefaultAppSettingsConfig

export interface Folder {
  type: 'folder'
  title: string
}

export interface Button {
  type: 'button'
  title: string
  onClick: () => void
}

export interface Param<T = any> {
  type: 'param'
  label: string
  /** If the value should be stored or that it is generated */
  generated?: boolean
  render?: (value: T, set?: (value: T) => void) => React.ReactNode
  value: T
  opts?: {
    readonly?: boolean
  }
}

export type Entry = (Folder | Button | Param) & { generated?: boolean }

export function parentKey(key: string) {
  return key.split('.').slice(0, -1).join('.')
}

export interface SettingsContextType {
  /** Do not change any of these values use `set()` and `add()` */
  values: Record<Params<DefaultAppSettingsConfig>, any>
  /** Do not change any of these values use `set()` and `add()` */
  config: DefaultAppSettingsConfig
  set: (key: Params<DefaultAppSettingsConfig>, value: any) => void
  add: (key: string, entry: Entry) => void
  /** Remove all values under this key */
  remove: (key: string) => void
}

export type Listener = (value: any) => void

// Core Settings class to handle the settings logic
export class Settings {
  private settings: DefaultAppSettingsConfig
  private listeners: Map<string | null, Listener[]> = new Map()

  constructor() {
    // Initialize with default settings
    const defaultSettingsConfig = { ...defaultAppSettingsConfig } as Record<
      string,
      any
    >

    // Load stored settings from localStorage
    const storageSettings = localStorage.get('settings')
    if (storageSettings !== null) {
      for (const [key, value] of Object.entries(storageSettings)) {
        defaultSettingsConfig[key] = {
          ...(defaultSettingsConfig[key] ?? {}),
          ...(value as any),
        }
      }
    }

    this.settings = defaultSettingsConfig as DefaultAppSettingsConfig
  }

  get values(): Record<Params<DefaultAppSettingsConfig>, any> {
    return Object.fromEntries(
      Object.entries(this.settings)
        .filter(([_, entry]) => (entry as Entry).type === 'param')
        .map(([key, entry]) => [key, (entry as Param).value]),
    ) as Record<Params<DefaultAppSettingsConfig>, any>
  }

  // Get all settings
  get config(): DefaultAppSettingsConfig {
    return this.settings
  }

  // Set a param value
  set(key: Params<DefaultAppSettingsConfig>, value: any): void {
    const entry = this.settings[key]
    if (entry.type !== 'param') throw Error('not a param')
    entry.value = value
    this.saveAndNotify()

    this.listeners.get(key)?.forEach((listener) => listener(entry))
  }

  // Add a new entry
  add(key: string, entry: Entry): void {
    if (
      entry.type === 'param' &&
      (this.settings[parentKey(key) as keyof DefaultAppSettingsConfig] as Entry)
        ?.type !== 'folder'
    ) {
      throw Error('parent is not a folder')
    }

    this.settings[key as keyof DefaultAppSettingsConfig] = entry as any
    ;(this.settings[key as keyof DefaultAppSettingsConfig] as Entry).generated =
      true
    this.saveAndNotify()
  }

  // Remove an entry and its children
  remove(key: string): void {
    const newSettings: Record<string, any> = { ...this.settings }
    for (const k in newSettings) {
      if (k.startsWith(key)) {
        delete newSettings[k]
      }
    }
    this.settings = newSettings as DefaultAppSettingsConfig
    this.saveAndNotify()
  }

  // Save settings to localStorage and notify listeners
  private saveAndNotify(): void {
    // Remove generated settings before saving
    const clone = { ...this.settings }
    const saveSettings = Object.fromEntries(
      Object.entries(clone).filter(([_, value]) => !(value as Entry).generated),
    ) as DefaultAppSettingsConfig

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
