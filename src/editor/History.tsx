import { useState, useCallback, useRef } from 'react'
import React from 'react'
import Box from '@mui/material/Box'
import { IconButton, Collapse, Stack } from '@mui/material'
import ArrowLeft from '@mui/icons-material/ArrowLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useHistory, useSettings } from '../events/useEditorEvents'
import { HistoryItemChip } from './HistoryItemChip'
import { HistoryItem } from '../vcs/VCS'

function HistoryLink({ item, last }: { item: HistoryItem; last: boolean }) {
  const fullscreen = useSettings('editor.fullscreen')
  return (
    <>
      <HistoryItemChip item={item} />
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
  parentRef,
  onExpandedChange,
}: {
  parentRef: React.RefObject<HTMLDivElement | null>
  onExpandedChange?: (expanded: boolean) => void
}) {
  const historyBufferSize = useSettings('editor.history_buffer_size')
  const history = useHistory(historyBufferSize)
  const [expanded, setExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const historyRef = useRef<HTMLDivElement>(null)
  const setupCheckOverflow = useCallback(() => {
    const parent = parentRef.current
    const history = historyRef.current
    if (!history || !parent) return

    const checkOverflow = () => {
      const isContentOverflowing = history.clientWidth > parent.clientWidth
      setIsOverflowing(isContentOverflowing)
    }

    checkOverflow()
    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(history)

    const mutationObserver = new MutationObserver(checkOverflow)
    mutationObserver.observe(history, { childList: true, subtree: true })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [parentRef])

  const toggleExpand = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    onExpandedChange?.(newExpanded)
  }

  const renderHistoryItems = () => {
    return history.map((item, index) => (
      <React.Fragment key={index}>
        <HistoryLink item={item} last={index >= history.length - 1} />
      </React.Fragment>
    ))
  }

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        historyRef.current = node
        setupCheckOverflow()
      }}
    >
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
            backgroundColor: 'background.paper',
            '&:hover': { backgroundColor: 'action.hover' },
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
          style={{
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
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
