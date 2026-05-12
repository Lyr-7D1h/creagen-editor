import { useColorScheme, useTheme } from '@mui/material'
import { useEffect, useRef } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { useSettings } from '../events/useEditorEvents'
import type { EditorTheme } from './Editor'
import { EditorBar } from './EditorBar'

export interface EditorProps {
  width?: string
  height?: string
  menu: boolean
  toggleMenu: () => void
  active?: boolean
}

export function EditorView({
  width,
  height,
  menu,
  toggleMenu,
  active = true,
}: EditorProps) {
  const { mode, systemMode } = useColorScheme()
  const creagenEditor = useCreagenEditor()
  const hideAll = useSettings('hide_all')
  const vimEnabled = useSettings('editor.vim')
  const editorContentRef = useRef<HTMLDivElement>(null)
  const vimStatusRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  useEffect(() => {
    if (!active) {
      return
    }

    const editorContent = editorContentRef.current
    if (!editorContent) {
      return
    }

    const htmlElement = creagenEditor.editor.html()
    if (htmlElement.parentElement !== editorContent) {
      editorContent.appendChild(htmlElement)
      creagenEditor.editor.layout()
    }
  }, [active, creagenEditor.editor])

  useEffect(() => {
    const vimStatus = vimStatusRef.current
    if (vimEnabled && vimStatus) {
      creagenEditor.editor.setVimStatusElement(vimStatus)
    }
  }, [vimEnabled, creagenEditor])

  useEffect(() => {
    let _mode = mode
    if (_mode === 'system') {
      _mode = systemMode
    }

    let theme: EditorTheme = 'creagen'
    if (_mode === 'dark') {
      theme = 'creagen-dark'
    }
    creagenEditor.editor.setTheme(theme)
  }, [creagenEditor.editor, mode, systemMode])

  return (
    <div
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        position: 'relative',
        display: hideAll ? 'none' : 'flex',
        overflow: 'hidden',
        flexDirection: 'column',
      }}
    >
      <EditorBar menu={menu} toggleMenu={toggleMenu} />

      <div style={{ flex: 1, overflow: 'hidden' }} ref={editorContentRef}></div>

      {vimEnabled && (
        <div
          ref={vimStatusRef}
          style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: theme.palette.text.secondary,
            fontFamily: 'monospace',
          }}
        />
      )}
    </div>
  )
}
