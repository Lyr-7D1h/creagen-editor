import { Add, ChevronRight } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { History } from './History'
import React, { useEffect, useRef, useState } from 'react'
import { ActiveBookmark } from './ActiveBookmark'
import { HtmlTooltip } from './HtmlTooltip'
import { useSettings } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { logger } from '../logs/logger'
import { Actions } from '../creagen-editor/Actions'

const BAR_HEIGHT = 18
export function EditorBar({
  menu,
  toggleMenu,
}: {
  menu: boolean
  toggleMenu: () => void
}) {
  const creagenEditor = useCreagenEditor()
  const showActiveBookmark = useSettings('editor.show_active_bookmark')
  const historyEnabled = useSettings('editor.show_history')
  const isFullscreen = useSettings('editor.fullscreen')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [inlineHistoryInTopBar, setInlineHistoryInTopBar] = useState(false)
  const hasSecondHistoryRow = historyEnabled && !inlineHistoryInTopBar
  const compactSingleRow =
    isFullscreen && !hasSecondHistoryRow && !historyExpanded

  const rootRef = useRef<HTMLDivElement>(null)
  const topRowRef = useRef<HTMLDivElement>(null)
  const historyRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const updateLayout = () => {
      const hasEnoughSpace = root.clientWidth >= 960
      setInlineHistoryInTopBar(isFullscreen && historyEnabled && hasEnoughSpace)
    }

    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(root)

    return () => {
      observer.disconnect()
    }
  }, [historyEnabled, isFullscreen])

  return (
    <div
      ref={rootRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: 2,
        position: 'relative',
        height: compactSingleRow ? BAR_HEIGHT : 'auto',
        minHeight: BAR_HEIGHT,
        gap: hasSecondHistoryRow ? 2 : 0,
        backgroundColor: isFullscreen ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
        color: isFullscreen ? '#fff' : 'grey',
      }}
    >
      <div
        ref={topRowRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems:
            inlineHistoryInTopBar && historyExpanded ? 'flex-start' : 'center',
          minHeight: BAR_HEIGHT,
          width: '100%',
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
              color: 'inherit',
            }}
            onClick={() => toggleMenu()}
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
        <HtmlTooltip
          title={`New project (${creagenEditor.getKeybindKeyString('new')})`}
          placement="right"
        >
          <IconButton
            sx={{
              width: BAR_HEIGHT,
              height: BAR_HEIGHT,
              padding: 0,
              margin: 0,
              color: 'inherit',
            }}
            onClick={() => {
              creagenEditor.new().catch(logger.error)
            }}
            size="small"
          >
            <Add />
          </IconButton>
        </HtmlTooltip>
        {showActiveBookmark ? (
          <div>
            <ActiveBookmark color={isFullscreen ? '#fff' : undefined} />
          </div>
        ) : (
          ''
        )}

        {historyEnabled && inlineHistoryInTopBar && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <History
              parentRef={topRowRef}
              onExpandedChange={setHistoryExpanded}
            />
          </div>
        )}

        <div style={{ flex: 1 }} />
        <Actions
          toggleMenu={toggleMenu}
          sizeVariant="compact"
          orientation="row"
          includeMenuToggle={false}
        />
      </div>

      {historyEnabled && !inlineHistoryInTopBar && (
        <div
          ref={historyRowRef}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: historyExpanded ? 'flex-start' : 'center',
            minHeight: BAR_HEIGHT,
            width: '100%',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <History
              parentRef={historyRowRef}
              onExpandedChange={setHistoryExpanded}
            />
          </div>
        </div>
      )}
    </div>
  )
}
