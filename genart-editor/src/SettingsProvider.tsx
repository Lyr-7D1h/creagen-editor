import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react'
import { localStorage } from './localStorage'
import { DEBUG, GENART_EDITOR_VERSION, GENART_VERSION, MODE } from './env'
import { generateHumanReadableName } from './util'

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
    value: [
      {
        name: '@lyr_7d1h/genart',
      },
    ] as { name: string; version?: string }[],
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
    value: `genart@${GENART_VERSION}`,
    opts: {
      readonly: true,
    },
  },
  'debug.editor': {
    type: 'param',
    label: 'Editor Version',
    value: `${GENART_EDITOR_VERSION}`,
    opts: {
      readonly: true,
    },
  },
}

type DefaultAppSettingsConfig = SettingsConfig<typeof defaultAppSettingsConfig>

type Generic<T> = {
  [K in keyof T]: K extends 'type' ? string : T[K]
}
type GenericSettingsConfig = Record<
  string,
  Generic<Param> | Generic<Folder> | Generic<Button>
>
type SettingsConfig<T extends GenericSettingsConfig> = {
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

export interface Folder {
  type: 'folder'
  title: string
}

export interface Button {
  type: 'button'
  title: string
  onClick: () => void
}

export interface Param {
  type: 'param'
  label: string
  value: any
  opts?: {
    readonly?: boolean
  }
}

export type Entry = Folder | Button | Param

export function SettingsProvider({ children }: PropsWithChildren) {
  const defaultSettingsConfig = {
    ...defaultAppSettingsConfig,
    ...(localStorage.get('settings') ?? {}),
  } as DefaultAppSettingsConfig
  let [settings, setSettingsState] = useState<DefaultAppSettingsConfig>(
    defaultSettingsConfig,
  )

  function setSettings(settings: DefaultAppSettingsConfig) {
    setSettingsState(settings)
    localStorage.set('settings', settings)
  }

  if (settings === null) return

  const values = Object.fromEntries(
    Object.entries(settings)
      .filter(([_, entry]) => (entry as Entry).type === 'param')
      .map(([key, entry]) => [key, (entry as Param).value]),
  ) as Record<Params<DefaultAppSettingsConfig>, any>

  return (
    <SettingsContext.Provider
      value={{
        values,
        config: settings,
        set: (key: Params<DefaultAppSettingsConfig>, value: any) => {
          const entry = settings[key]
          if (entry.type !== 'param') throw Error('not a param')
          entry.value = value
          setSettings({ ...settings })
        },
        add: (key: string, entry: Entry) => {
          ;(settings as Record<string, any>)[key] = entry
          setSettings({ ...settings })
        },
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

const SettingsContext = createContext<{
  values: Record<Params<DefaultAppSettingsConfig>, any>
  config: DefaultAppSettingsConfig
  set: (key: Params<DefaultAppSettingsConfig>, value: any) => void
  add: (key: string, entry: Entry) => void
} | null>(null)

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('not initialized')
  }
  return context
}
