import React from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import {
  useForceUpdateOnEditorEvent,
  useSettings,
} from '../events/useEditorEvents'
import { ParamsViewPresentation } from './ParamsViewPresentation'
import { generateRandomValue } from './params-util'

/** Container component - handles state and logic */
export function ParamsView() {
  const creagenEditor = useCreagenEditor()
  const params = creagenEditor.params

  useForceUpdateOnEditorEvent(['params:value', 'params:config'])

  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)
  const autoRender = useSettings('params.auto_render')
  const compactLayout = useSettings('params.compact_layout')

  const handleValueChange = (key: string, newValue: unknown) => {
    creagenEditor.params.setValue(key, newValue)
    forceUpdate()

    if (autoRender) {
      void creagenEditor.render()
    }
  }

  const handleRandomizeAll = React.useCallback(() => {
    params.configs.forEach((config, key) => {
      const randomValue = generateRandomValue(config)
      creagenEditor.params.setValue(key, randomValue)
    })
    forceUpdate()

    if (autoRender) {
      void creagenEditor.render()
    }
  }, [creagenEditor, params.configs, autoRender, forceUpdate])

  const handleResetToDefaults = () => {
    params.configs.forEach((config, key) => {
      let defaultValue: unknown = config.default
      if (typeof config.default === 'function') {
        defaultValue = (config.default as () => unknown)()
      }
      creagenEditor.params.setValue(key, defaultValue)
    })
    forceUpdate()

    if (autoRender) {
      void creagenEditor.render()
    }
  }

  // Manage automatic regeneration interval. Placed after handlers so it can call them.
  React.useEffect(() => {
    let id: number | undefined
    if (params.regenInterval > 0) {
      // run an immediate randomization, then schedule recurring
      handleRandomizeAll()
      id = window.setInterval(() => {
        handleRandomizeAll()
      }, params.regenInterval) as unknown as number
    }
    return () => {
      if (id != null) window.clearInterval(id as unknown as number)
    }
  }, [handleRandomizeAll, params.regenInterval])

  return (
    <ParamsViewPresentation
      configs={params.configs}
      values={params.store}
      compactLayout={Boolean(compactLayout)}
      autoRender={autoRender}
      regenIntervalMs={params.regenInterval}
      onValueChange={handleValueChange}
      onRandomizeAll={handleRandomizeAll}
      onResetToDefaults={handleResetToDefaults}
      onRegenIntervalChange={(int) => params.setRegenInterval(int)}
      onCompactLayoutChange={(compact) =>
        creagenEditor.settings.set('params.compact_layout', compact)
      }
      onAutoRenderChange={(autoRender) =>
        creagenEditor.settings.set('params.auto_render', autoRender)
      }
    />
  )
}
