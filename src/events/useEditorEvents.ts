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
export function useEditorEvent<K extends EditorEvent>(eventType: K | K[]) {
  const [data, setData] = useState<EditorEventData<K> | null>(null)

  useEffect(() => {
    return editorEvents.on(eventType, setData)
  }, [eventType])

  return data
}

/**
 * Hook that forces re-render whenever event type(s) is emitted
 * Does not return any data, just triggers component update
 */
export function useForceUpdateOnEditorEvent<K extends EditorEvent>(
  eventType: K | K[],
) {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    return editorEvents.on(eventType, () => {
      forceUpdate({})
    })
  }, [eventType])
}

export const useSettingsAll = () => {
  const editor = useCreagenEditor()

  const [value, setValue] = useState(() => editor.settings.values)

  useEffect(() => {
    return editorEvents.on('settings:changed', () => {
      setValue(editor.settings.values)
    })
  }, [editor.settings])

  return value
}

export const useSettings = <P extends ParamKey>(key: P): ParamValue<P> => {
  const editor = useCreagenEditor()

  const [value, setValue] = useState<ParamValue<P>>(
    () => editor.settings.values[key] as ParamValue<P>,
  )

  useEffect(() => {
    return editorEvents.on(
      'settings:changed',
      ({ key: changedKey, value: newValue }) => {
        if (changedKey === key) {
          setValue(newValue as ParamValue<P>)
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
    return editorEvents.on('vcs:checkout', ({ new: n }) => {
      setValue(n)
    })
  }, [vcs.head])

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
      editorEvents.on('vcs:bookmark-update', () => {
        setValue(vcs.activeBookmark)
      }),
    ]
    return () => listeners.forEach((l) => l())
  }, [vcs.activeBookmark])

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
      editorEvents.on('vcs:bookmark-update', () => {
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
      editorEvents.on('vcs:bookmark-update', updateHistory),
    ]
    return () => destroy.forEach((cb) => cb())
  }, [creagenEditor.vcs, setHistory, size])

  return history
}

export const useWelcome = () => {
  const [value, setValue] = useLocalStorage('welcome', true)

  useEffect(() => {
    return editorEvents.on('welcome', (value) => {
      setValue(value)
    })
  }, [setValue])

  return value
}
