import React, { useEffect, useRef } from 'react'
import { useSettings } from '../settings/SettingsProvider'
import { History } from './History'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

export interface EditorProps {
  width?: string
  height?: string
}

export function EditorView({ width, height }: EditorProps) {
  const creagenEditor = useCreagenEditor()
  const settings = useSettings()
  const editorContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const editorContent = editorContentRef.current
    if (editorContent) {
      const htmlElement = creagenEditor.editor.html()
      editorContent.appendChild(htmlElement)
      creagenEditor.editor.layout()
    }
  }, [])

  return (
    <div
      style={{
        zIndex: 1001,
        height,
        width,
        display: settings.values['hide_all'] ? 'none' : 'flex',
        flexDirection: 'column',
      }}
    >
      <History />
      <div style={{ flex: 1, overflow: 'hidden' }} ref={editorContentRef}></div>
      {settings.values['editor.vim'] && (
        <div id="vim-status" style={{ overflow: 'auto' }} />
      )}
    </div>
  )
}
