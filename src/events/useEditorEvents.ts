import { useEffect, useState } from 'react'
import { editorEvents } from './events'
import { EditorEvent, EditorEventData } from './EditorEvent'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { ParamKey, ParamValue } from '../settings/SettingsConfig'
import { ActiveBookmark, HistoryItem } from '../vcs/VCS'
import { logger } from '../logs/logger'
import { useLocalStorage } from '../storage/useLocalStorage'

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
export const useActiveBookmark = () => {
  const editor = useCreagenEditor()
  const vcs = editor.vcs

  const [value, setValue] = useState<ActiveBookmark>(vcs.activeBookmark)

  useEffect(() => {
    const listeners = [
      editorEvents.on('vcs:checkout', () => {
        setValue(vcs.activeBookmark)
      }),
      editorEvents.on('vcs:bookmarkUpdate', () => {
        setValue(vcs.activeBookmark)
      }),
    ]
    return () => listeners.forEach((l) => l())
  }, [])

  return value
}

export const useBookmarks = () => {
  const editor = useCreagenEditor()
  const vcs = editor.vcs
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const listeners = [
      editorEvents.on('vcs:checkout', () => {
        forceUpdate({})
      }),
      editorEvents.on('vcs:bookmarkUpdate', () => {
        forceUpdate({})
      }),
    ]
    return () => listeners.forEach((l) => l())
  }, [])

  return vcs.bookmarks
}

export const useHistory = (size: number) => {
  const creagenEditor = useCreagenEditor()
  const [history, setHistory] = useState<HistoryItem[]>([])
  useEffect(() => {
    const updateHistory = () => {
      creagenEditor.vcs
        .history(size)
        .then((history) => {
          setHistory(history)
        })
        .catch(logger.error)
    }

    updateHistory()

    const destroy = [
      editorEvents.on('vcs:checkout', updateHistory),
      editorEvents.on('vcs:bookmarkUpdate', updateHistory),
    ]
    return () => destroy.forEach((cb) => cb())
  }, [setHistory, size])

  return history
}

export const useWelcome = () => {
  const [value, setValue] = useLocalStorage('welcome', true)

  useEffect(() => {
    return editorEvents.on('welcome', (value) => {
      setValue(value)
    })
  }, [])

  return value
}
