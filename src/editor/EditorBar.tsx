import { ChevronRight } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { History } from './History'
import React, { useRef, useState } from 'react'
import { ActiveBookmark } from './ActiveBookmark'
import { HtmlTooltip } from './HtmlTooltip'
import { useSettings } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

const BAR_HEIGHT = 18
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
  const isFullscreen = useSettings('editor.fullscreen')
  const [historyExpanded, setHistoryExpanded] = useState(false)

  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: historyExpanded ? 'flex-start' : 'center',
        padding: 2,
        position: 'relative',
        height: historyExpanded ? 'auto' : BAR_HEIGHT,
        minHeight: BAR_HEIGHT,
        backgroundColor: isFullscreen ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
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
            width: BAR_HEIGHT,
            height: BAR_HEIGHT,
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
          <ActiveBookmark color={isFullscreen ? '#fff' : undefined} />
        </div>
      ) : (
        ''
      )}
      {historyEnabled && (
        <History
          parentRef={ref}
          color={isFullscreen ? '#333' : undefined}
          onExpandedChange={setHistoryExpanded}
        />
      )}
    </div>
  )
}
