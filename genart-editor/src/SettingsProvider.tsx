import React, { createContext, PropsWithChildren, useContext } from 'react'
import { Settings, SettingsConfig } from './settings'
import { DEBUG, GENART_EDITOR_VERSION, GENART_VERSION, MODE } from './env'

const generatorSettingsConfig = {
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
}

const debugSettingsConfig = {
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

export type GeneratorSettingsConfig = SettingsConfig<
  typeof generatorSettingsConfig &
    typeof debugSettingsConfig & {
      'debug.fps': {
        type: 'param'
        label: 'FPS'
        value: undefined
        opts: {
          readonly: true
        }
      }
    }
>

const SettingsContext = createContext<Settings<GeneratorSettingsConfig> | null>(
  null,
)

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  let settings
  if (DEBUG) {
    const config = {
      ...debugSettingsConfig,
      ...generatorSettingsConfig,
    }
    settings = new Settings(config as SettingsConfig<typeof config>)
  } else {
    settings = new Settings(
      generatorSettingsConfig as SettingsConfig<typeof generatorSettingsConfig>,
    )
  }

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('not initialized')
  }
  return context
}
