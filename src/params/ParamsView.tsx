import { useCallback } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import {
  useForceUpdateOnEditorEvent,
  useSettings,
} from '../events/useEditorEvents'
import { ParamsViewPresentation } from './ParamsViewPresentation'

/** Container component - handles state and logic */
export function ParamsView() {
  const creagenEditor = useCreagenEditor()
  const params = creagenEditor.params

  useForceUpdateOnEditorEvent(['params:value', 'params:config'])

  const autoRender = useSettings('parameters.auto_render')
  const compactLayout = useSettings('parameters.compact_layout')

  const handleValueChange = (key: string, newValue: unknown) => {
    creagenEditor.params.setValue(key, newValue)

    if (autoRender) {
      void creagenEditor.render()
    }
  }

  const handleRandomizeAll = useCallback(() => {
    params.randomizeAll()

    if (autoRender) {
      void creagenEditor.render()
    }
  }, [params, creagenEditor, autoRender])

  const handleResetToDefaults = () => {
    params.resetToDefaults()

    if (autoRender) {
      void creagenEditor.render()
    }
  }

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
      onRegenIntervalChange={(int) => {
        params.setRegenInterval(int)
      }}
      onCompactLayoutChange={(compact) =>
        creagenEditor.settings.set('parameters.compact_layout', compact)
      }
      onAutoRenderChange={(autoRender) =>
        creagenEditor.settings.set('parameters.auto_render', autoRender)
      }
    />
  )
}
