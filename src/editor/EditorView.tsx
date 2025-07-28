import React, { useEffect, useRef, useState } from 'react'
import { History } from './History'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { IconButton, Tooltip } from '@mui/material'
import { ChevronRight } from '@mui/icons-material'
import { useSettings } from '../events/useEditorEvents'
import { EditableProjectName } from './EditableProjectName'

export interface EditorProps {
  left?: string
  width?: string
  height?: string
  menu: boolean
  onMenuOpen: () => void
}

export function EditorView({
  left,
  width,
  height,
  menu,
  onMenuOpen,
}: EditorProps) {
  const showActiveBookmark = useSettings('editor.show_active_bookmark')
  const creagenEditor = useCreagenEditor()
  const hideAll = useSettings('hide_all')
  const vimEnabled = useSettings('editor.vim')
  const editorContentRef = useRef<HTMLDivElement>(null)
  const iconButtonRef = useRef<HTMLButtonElement>(null)
  const projectNameRef = useRef<HTMLDivElement>(null)
  const [historyWidth, setHistoryWidth] = useState('100%')

  function updateHistoryWidth() {
    if (iconButtonRef.current && projectNameRef.current && width) {
      const iconWidth = iconButtonRef.current.offsetWidth
      const projectNameWidth = projectNameRef.current.offsetWidth
      const totalWidth =
        typeof width === 'string'
          ? width.includes('px')
            ? parseInt(width)
            : 0
          : parseInt(width || '0')

      const availableWidth = totalWidth - iconWidth - projectNameWidth - 4 // 4px for padding
      setHistoryWidth(`${availableWidth}px`)
    }
  }

  useEffect(() => {
    updateHistoryWidth()
  }, [width, menu])

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
      style={{
        position: 'absolute',
        left,
        zIndex: 1001,
        height,
        width,
        display: hideAll ? 'none' : 'flex',
        overflow: 'hidden',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          padding: 2,
        }}
      >
        <Tooltip
          title={menu ? 'Hide editor menu' : 'Show editor menu'}
          placement="right"
        >
          <IconButton
            ref={iconButtonRef}
            sx={{
              zIndex: 1002,
              left: 0,
              top: 0,
              width: 20,
              height: 20,
              padding: 0,
              margin: 0,
            }}
            onClick={() => onMenuOpen()}
            size="small"
          >
            <ChevronRight
              sx={{
                transform: menu ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s',
              }}
            />
          </IconButton>
        </Tooltip>
        {showActiveBookmark ? (
          <div ref={projectNameRef}>
            <EditableProjectName onUpdate={updateHistoryWidth} />
          </div>
        ) : (
          ''
        )}
        <History style={{ width: historyWidth }} />
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }} ref={editorContentRef}></div>

      {vimEnabled && <div id="vim-status" style={{ overflow: 'auto' }} />}
    </div>
  )
}
