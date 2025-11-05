import { ChevronRight } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { History } from './History'
import React, { useRef } from 'react'
import { ActiveBookmark } from './ActiveBookmark'
import { HtmlTooltip } from './HtmlTooltip'
import { useSettings } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

export function EditorBar({
  menu,
  onMenuOpen,
}: {
  menu: boolean
  onMenuOpen: () => void
}) {
  const creagenEditor = useCreagenEditor()
  const showActiveBookmark = useSettings('editor.show_active_bookmark')
  const historyEnabled = useSettings('editor.show_history')

  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'row',
        padding: 2,
        position: 'relative',
      }}
    >
      <HtmlTooltip
        title={
          menu
            ? 'Hide editor menu'
            : `Show editor menu (${creagenEditor.getKeybindKeyString('editor.toggleMenu')})`
        }
        placement="right"
      >
        <IconButton
          sx={{
            zIndex: 1002,
            left: 0,
            top: 0,
            width: 15,
            height: 15,
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
      </HtmlTooltip>
      {showActiveBookmark ? (
        <div>
          <ActiveBookmark />
        </div>
      ) : (
        ''
      )}
      {historyEnabled && <History parentRef={ref} />}
    </div>
  )
}
