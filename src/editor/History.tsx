import { useState, useEffect, useRef } from 'react'
import React from 'react'
import Box from '@mui/material/Box'
import { IconButton, Collapse, Stack, SxProps, Theme } from '@mui/material'
import ArrowLeft from '@mui/icons-material/ArrowLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useHistory, useSettings } from '../events/useEditorEvents'
import { HistoryItemChip } from './HistoryItemChip'

export function History({
  height,
  style,
}: {
  height?: string
  style?: SxProps<Theme>
}) {
  const historyBufferSize = useSettings('editor.history_buffer_size')
  const history = useHistory(historyBufferSize)
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

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
