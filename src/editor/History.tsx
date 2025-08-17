import { useState, useCallback, useRef } from 'react'
import React from 'react'
import Box from '@mui/material/Box'
import { IconButton, Collapse, Stack } from '@mui/material'
import ArrowLeft from '@mui/icons-material/ArrowLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useHistory, useSettings } from '../events/useEditorEvents'
import { HistoryItemChip } from './HistoryItemChip'

export function History({
  parentRef,
}: {
  parentRef: React.RefObject<HTMLDivElement | null>
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
  }, [])

  const toggleExpand = () => {
    setExpanded(!expanded)
  }

  const renderHistoryItems = () => {
    return history.map((item, index) => (
      <React.Fragment key={index}>
        <HistoryItemChip item={item} />
        {index < history.length - 1 && (
          <ArrowLeft fontSize="small" color="action" />
        )}
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
