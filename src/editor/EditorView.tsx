import React, { useEffect, useRef } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { useSettings } from '../events/useEditorEvents'
import { Actions } from '../creagen-editor/Actions'
import { EditorBar } from './EditorBar'

export interface EditorProps {
  width?: string
  ref?: React.RefObject<HTMLDivElement | null>
  menu: boolean
  onMenuOpen: () => void
  toggleMenu: () => void
}

export function EditorView({
  width,
  ref,
  menu,
  onMenuOpen,
  toggleMenu,
}: EditorProps) {
  const creagenEditor = useCreagenEditor()
  const hideAll = useSettings('hide_all')
  const actionsEnabled = useSettings('actions.enabled')
  const vimEnabled = useSettings('editor.vim')
  const editorContentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const editorContent = editorContentRef.current
    if (editorContent) {
      const htmlElement = creagenEditor.editor.html()
      editorContent.appendChild(htmlElement)
      creagenEditor.editor.layout()
    }
  }, [menu])

  return (
    <div
      ref={ref}
      style={{
        width,
        position: 'absolute',
        zIndex: 1001,
        height: '100%',
        display: hideAll ? 'none' : 'flex',
        overflow: 'hidden',
        flexDirection: 'column',
      }}
    >
      <EditorBar menu={menu} onMenuOpen={onMenuOpen} />

      <div style={{ flex: 1, overflow: 'hidden' }} ref={editorContentRef}></div>

      {vimEnabled && <div id="vim-status" style={{ overflow: 'auto' }} />}

      {actionsEnabled ?? (
        <Actions
          toggleMenu={toggleMenu}
          style={{ position: 'absolute', bottom: 6, right: 14 }}
        />
      )}
    </div>
  )
}
