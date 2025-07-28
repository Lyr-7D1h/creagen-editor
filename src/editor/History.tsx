import { useState, useEffect, useRef } from 'react'
import { logger } from '../logs/logger'
import React from 'react'
import Box from '@mui/material/Box'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { IconButton, Collapse, Stack, SxProps, Theme } from '@mui/material'
import ArrowLeft from '@mui/icons-material/ArrowLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useSettings } from '../events/useEditorEvents'
import { HistoryItem } from '../vcs/VCS'
import { editorEvents } from '../events/events'
import { HistoryItemChip } from './HistoryItemChip'

const HISTORY_SIZE = 10
export function History({
  height,
  style,
}: {
  height?: string
  style?: SxProps<Theme>
}) {
  const creagenEditor = useCreagenEditor()
  const historyEnabled = useSettings('editor.show_history')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const updateHistory = () => {
      creagenEditor.vcs
        .history(HISTORY_SIZE)
        .then((history) => {
          setHistory(history)
        })
        .catch(logger.error)
    }

    updateHistory()

    const destroy = [
      editorEvents.on('vcs:checkout', updateHistory),
      editorEvents.on('vcs:bookmarkUpdate', updateHistory),
    ]
    return () => destroy.forEach((cb) => cb())
  }, [setHistory])

  // Check for overflow after history updates or window resizes
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const isContentOverflowing =
          containerRef.current.scrollWidth > containerRef.current.clientWidth
        setIsOverflowing(isContentOverflowing)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)

    return () => window.removeEventListener('resize', checkOverflow)
  }, [history])

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

  if (historyEnabled === false || history.length == 0) {
    return ''
  }

  return (
    <Box sx={{ position: 'relative', ...style }}>
      {isOverflowing && (
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

      <Collapse
        in={expanded || !isOverflowing}
        collapsedSize={isOverflowing ? '30px' : 'auto'}
      >
        <div
          ref={containerRef}
          style={{
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              height,
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
