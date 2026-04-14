import { useEffect, useState } from 'react'
import { editorEvents } from './events'
import { EditorEvent, EditorEventData } from './EditorEvent'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { CommitMetadata } from '../creagen-editor/CommitMetadata'
import { ParamKey, ParamValue } from '../settings/SettingsConfig'
import { HistoryItem } from 'versie'
import { logger } from '../logs/logger'
import { useLocalStorage } from '../storage/useLocalStorage'
import { ActiveBookmark, CreagenEditor } from '../creagen-editor/CreagenEditor'

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
  const [hook, forceUpdate] = useState({})

  useEffect(() => {
    return editorEvents.on(eventType, () => {
      forceUpdate({})
    })
  }, [eventType])

  return hook
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
  const [value, setValue] = useState(() => editor.head?.hash)

  useEffect(() => {
    return editorEvents.on('vcs:checkout', ({ new: n }) => {
      setValue(n)
    })
  }, [editor.head])

  return value
}

/** Get the current active reference */
export const useActiveBookmark = () => {
  const editor = useCreagenEditor()

  const [value, setValue] = useState<ActiveBookmark>(editor.activeBookmark)

  useEffect(() => {
    const listeners = [
      editorEvents.on('vcs:checkout', () => {
        setValue(editor.activeBookmark)
      }),
      editorEvents.on('vcs:bookmark-update', () => {
        setValue(editor.activeBookmark)
      }),
    ]
    return () => listeners.forEach((l) => l())
  }, [editor.activeBookmark])

  return value
}

export const useBookmarks = () => {
  const editor = useCreagenEditor()
  const [value, setValue] = useState(editor.getAllBookmarks())

  useEffect(() => {
    const listeners = [
      editorEvents.on('vcs:checkout', () => {
        setValue(editor.getAllBookmarks())
      }),
      editorEvents.on('vcs:bookmark-update', () => {
        setValue(editor.getAllBookmarks())
      }),
    ]
    return () => listeners.forEach((l) => l())
  }, [editor])

  return value
}

export const useHistory = (size: number) => {
  const creagenEditor = useCreagenEditor()
  const [history, setHistory] = useState<HistoryItem<CommitMetadata>[]>([])
  useEffect(() => {
    const updateHistory = () => {
      creagenEditor
        .history(size)
        .then((historyResult) => {
          if (!historyResult.ok) {
            logger.error(historyResult.error)
            return
          }
          setHistory(historyResult.value)
        })
        .catch(logger.error)
    }

    updateHistory()

    const destroy = [
      editorEvents.on('vcs:commit', updateHistory),
      editorEvents.on('vcs:checkout', updateHistory),
      editorEvents.on('vcs:bookmark-update', updateHistory),
    ]
    return () => destroy.forEach((cb) => cb())
  }, [creagenEditor, setHistory, size])

  return history
}

export const useIsDirty = (editor: CreagenEditor) => {
  const [isDirty, setIsDirty] = useState(editor.editor.isDirty())
  useEffect(() => {
    return editorEvents.on('editor:code-dirty', () => {
      setIsDirty(editor.editor.isDirty())
    })
  }, [editor.editor])
  return isDirty
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

export function useLibraries() {
  const editor = useCreagenEditor()
  const [libs, setLibs] = useState(editor.libraryImports)

  useEffect(() => {
    editorEvents.on(['deps:add', 'deps:remove'], () => {
      setLibs(new Map(editor.libraryImports))
    })
  })

  return libs
}
