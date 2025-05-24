import React, { useEffect, useRef, useState } from 'react'
import { useSettings } from '../settings/SettingsProvider'
import { History } from './History'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import MenuIcon from '@mui/icons-material/Menu'
import { IconButton } from '@mui/material'
import { VCSView } from './VCSView'

export interface EditorProps {
  width?: string
  height?: string
}

export function EditorView({ width, height }: EditorProps) {
  const creagenEditor = useCreagenEditor()
  const settings = useSettings()
  const editorContentRef = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    if (menu === false) {
      const editorContent = editorContentRef.current
      if (editorContent) {
        const htmlElement = creagenEditor.editor.html()
        editorContent.appendChild(htmlElement)
        creagenEditor.editor.layout()
      }
    }
  }, [menu])

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
      <div
        style={{
          height: '24px',
          display: 'flex',
          flexDirection: 'row',
          padding: 2,
        }}
      >
        <IconButton
          sx={{
            zIndex: 99999999,
            left: 0,
            top: 0,
            minWidth: 30,
            padding: 0,
          }}
          onClick={() => setMenu(!menu)}
          size="small"
        >
          <MenuIcon
            sx={{
              transform: menu ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.3s',
            }}
          />
        </IconButton>
        <History style={{ flex: 1, height: '24px' }} />
      </div>
      {menu ? (
        <VCSView />
      ) : (
        <div
          style={{ flex: 1, overflow: 'hidden' }}
          ref={editorContentRef}
        ></div>
      )}
      {settings.values['editor.vim'] && (
        <div id="vim-status" style={{ overflow: 'auto' }} />
      )}
    </div>
  )
}
