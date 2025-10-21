import React, { useEffect, useRef } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { useSettings } from '../events/useEditorEvents'
import { Actions } from '../creagen-editor/Actions'
import { EditorBar } from './EditorBar'
import { useTheme } from '@mui/material'

export interface EditorProps {
  width?: string
  height?: string
  menu: boolean
  onMenuOpen: () => void
  toggleMenu: () => void
}

export function EditorView({
  width,
  height,
  menu,
  onMenuOpen,
  toggleMenu,
}: EditorProps) {
  const creagenEditor = useCreagenEditor()
  const hideAll = useSettings('hide_all')
  const actionsEnabled = useSettings('actions.enabled')
  const vimEnabled = useSettings('editor.vim')
  const editorContentRef = useRef<HTMLDivElement>(null)
  const vimStatusRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  useEffect(() => {
    const editorContent = editorContentRef.current
    if (editorContent) {
      const htmlElement = creagenEditor.editor.html()
      editorContent.appendChild(htmlElement)
      creagenEditor.editor.layout()
    }
  }, [creagenEditor.editor, menu])

  useEffect(() => {
    const vimStatus = vimStatusRef.current
    if (vimEnabled && vimStatus) {
      creagenEditor.editor.setVimStatusElement(vimStatus)
    }
  }, [vimEnabled, creagenEditor])

  return (
    <div
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        position: 'relative',
        zIndex: 1001,
        display: hideAll ? 'none' : 'flex',
        overflow: 'hidden',
        flexDirection: 'column',
      }}
    >
      <EditorBar menu={menu} onMenuOpen={onMenuOpen} />

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

      {actionsEnabled ? (
        <Actions
          toggleMenu={toggleMenu}
          style={{ position: 'absolute', bottom: 6, right: 14 }}
        />
      ) : (
        ''
      )}
    </div>
  )
}
