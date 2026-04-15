import { useState, useEffect, useRef } from 'react'
import React from 'react'
import Box from '@mui/material/Box'
import { IconButton, Collapse, Stack } from '@mui/material'
import ArrowLeft from '@mui/icons-material/ArrowLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useActiveBookmark, useSettings } from '../events/useEditorEvents'
import { HistoryItemChip } from './HistoryItemChip'
import type { HistoryItem } from 'versie'
import type { CommitMetadata } from '../creagen-editor/CommitMetadata'
import type { ActiveBookmark } from '../creagen-editor/CreagenEditor'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'

function HistoryLink({
  item,
  last,
  fullscreen,
  head,
  activeBookmark,
}: {
  item: HistoryItem<CommitMetadata>
  last: boolean
  fullscreen: boolean
  head?: string
  activeBookmark: ActiveBookmark
}) {
  return (
    <>
      <HistoryItemChip
        active={head === item.commit.hash.toHex()}
        item={item}
        fullscreen={fullscreen}
        activeBookmark={activeBookmark}
      />
      {!last && (
        <ArrowLeft
          sx={{ color: fullscreen ? '#bbb' : undefined }}
          fontSize="small"
          color="action"
        />
      )}
    </>
  )
}

export function History({
  items,
  parentRef,
  onExpandedChange,
}: {
  items: HistoryItem<CommitMetadata>[]
  parentRef: React.RefObject<HTMLDivElement | null>
  onExpandedChange?: (expanded: boolean) => void
}) {
  const fullscreen = useSettings('editor.fullscreen')
  const activeBookmark = useActiveBookmark()
  const editor = useCreagenEditor()
  const [expanded, setExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const historyRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = parentRef.current
    const container = historyRef.current
    const content = contentRef.current
    if (!container || !content || !parent) return

    const checkOverflow = () => {
      const availableWidth = Math.min(container.clientWidth, parent.clientWidth)
      const isContentOverflowing = content.scrollWidth > availableWidth
      setIsOverflowing(isContentOverflowing)
    }

    checkOverflow()
    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(container)
    resizeObserver.observe(parent)
    resizeObserver.observe(content)

    const mutationObserver = new MutationObserver(checkOverflow)
    mutationObserver.observe(content, { childList: true, subtree: true })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [items, parentRef, expanded])

  const toggleExpand = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    onExpandedChange?.(newExpanded)
  }

  const renderHistoryItems = () => {
    return items.map((item, index) => (
      <React.Fragment key={index}>
        <HistoryLink
          item={item}
          head={editor.head?.hash.toHex()}
          last={index >= items.length - 1}
          fullscreen={fullscreen}
          activeBookmark={activeBookmark}
        />
      </React.Fragment>
    ))
  }

  return (
    <Box ref={historyRef} sx={{ position: 'relative' }}>
      {(isOverflowing || expanded) && (
        <IconButton
          size="small"
          onClick={toggleExpand}
          sx={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            width: 18,
            height: 18,
            padding: 0,
            margin: 0,
            color: fullscreen ? 'inherit' : undefined,
            backgroundColor: fullscreen ? 'transparent' : 'background.paper',
            '&:hover': {
              backgroundColor: fullscreen ? 'transparent' : 'action.hover',
            },
          }}
        >
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
      )}

      <Collapse in={expanded || !isOverflowing} collapsedSize={24}>
        <div
          ref={contentRef}
          style={{
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              color: 'black',
              paddingLeft: 1,
              paddingRight: isOverflowing ? 4 : 1, // Add padding for the expand button
              flexWrap: expanded ? 'wrap' : 'nowrap',
            }}
          >
            {renderHistoryItems()}
          </Stack>
        </div>
      </Collapse>
    </Box>
  )
}
