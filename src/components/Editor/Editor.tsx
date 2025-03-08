import React, { useEffect, useRef } from 'react'
import { editor } from 'monaco-editor'
import MonacoEditor, { Monaco } from '@monaco-editor/react'
import { useSettings } from '../../SettingsProvider'
import { Editor } from './editor'

export interface EditorProps {
  value?: string
  width?: string
  height?: string
  minimap?: boolean
  onLoad?: (editor: Editor) => void
}

export function EditorView({ value, width, height, onLoad }: EditorProps) {
  const editorRef = useRef<Editor>(null)
  const settings = useSettings()

  /** Update editor based on global settings */
  function update(editor: Editor) {
    editor.setVimMode(settings.values['editor.vim'])
    editor.setFullscreenMode(settings.values['editor.fullscreen'])
    if (settings.values['editor.relative_lines']) {
      editor.updateOptions({ lineNumbers: 'relative' })
    } else {
      editor.updateOptions({ lineNumbers: 'on' })
    }
  }

  // if (editorRef.current !== null) {
  useEffect(() => {
    if (editorRef.current === null) return
    update(editorRef.current)
  }, [
    settings.values['editor.vim'],
    settings.values['editor.fullscreen'],
    settings.values['editor.relative_lines'],
    editorRef,
  ])

  function handleEditorDidMount(
    monacoEditor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    const editor = new Editor(monacoEditor, monaco)
    editorRef.current = editor

    update(editor)
    if (typeof onLoad !== 'undefined') onLoad(editor)
  }

  return (
    <>
      <MonacoEditor
        width={width}
        height={height}
        defaultValue={value ?? ''}
        language="typescript"
        theme="creagen"
        beforeMount={Editor.handleBeforeMount}
        onMount={handleEditorDidMount}
        loading={<div>Loading...</div>}
        value=""
        options={{
          minimap: { enabled: false },
          tabSize: 2,
          // TODO: formatting
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,

          // allow for resizing
          automaticLayout: true,
        }}
      />
      {settings.values['editor.vim'] && (
        <div
          id="vim-status"
          style={{ position: 'absolute', bottom: 0, left: 20 }}
        />
      )}
    </>
  )
}
