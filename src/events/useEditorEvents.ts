import { useEffect, useState } from 'react'
import { editorEvents } from './events'
import { EditorEvent, EditorEventData } from './EditorEvent'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { ParamKey, ParamValue } from '../settings/SettingsConfig'
import { ActiveRef } from '../vcs/VCS'

/**
 * Hook that subscribes to an event and triggers re-render when emitted
 */
export function useEditorEvent<K extends EditorEvent>(eventType: K) {
  const [data, setData] = useState<EditorEventData<K> | null>(null)

  useEffect(() => {
    return editorEvents.on(eventType, setData)
  }, [eventType])

  return data
}

export const useSettingsAll = () => {
  const editor = useCreagenEditor()

  const [value, setValue] = useState(() => editor.settings.values)

  useEffect(() => {
    const currentValue = editor.settings.values
    setValue(currentValue)

    return editorEvents.on('settings:changed', () => {
      setValue(editor.settings.values)
    })
  }, [])

  return value
}

export const useSettings = <P extends ParamKey>(key: P): ParamValue<P> => {
  const editor = useCreagenEditor()

  const [value, setValue] = useState(() => editor.settings.values[key])

  useEffect(() => {
    const currentValue = editor.settings.values[key]
    setValue(currentValue)

    return editorEvents.on(
      'settings:changed',
      ({ key: changedKey, value: newValue }) => {
        if (changedKey === key) {
          setValue(newValue)
        }
      },
    )
  }, [key])

  return value
}

export const useHead = () => {
  const editor = useCreagenEditor()
  const vcs = editor.vcs

  const [value, setValue] = useState(() => vcs.head)

  useEffect(() => {
    const currentValue = vcs.head
    setValue(currentValue)

    return editorEvents.on('vcs:checkout', ({ new: n }) => {
      setValue(n)
    })
  }, [])

  return value
}

/** Get the current active reference */
export const useActiveRef = () => {
  const editor = useCreagenEditor()
  const vcs = editor.vcs

  const [value, setValue] = useState<ActiveRef>(vcs.activeRef)

  useEffect(() => {
    const listeners = [
      editorEvents.on('vcs:checkout', () => {
        setValue(vcs.activeRef)
      }),
      editorEvents.on('vcs:renameRef', () => {
        setValue(vcs.activeRef)
      }),
    ]
    return () => listeners.forEach((l) => l())
  }, [])

  return value
}
