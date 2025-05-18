import { useState, useEffect, useRef } from 'react'
import { creagenEditor } from '../creagen-editor/CreagenEditorView'
import { ID } from '../creagen-editor/id'
import { logger } from '../logs/logger'
import React from 'react'
import {
  Chip,
  Stack,
  Typography,
  IconButton,
  Collapse,
  Box,
} from '@mui/material'
import { ArrowLeft, ExpandMore, ExpandLess } from '@mui/icons-material'
import { Generation } from '../vcs/Generation'

const HISTORY_SIZE = 10
export function History() {
  const activeIdRef = useRef<ID | null>(
    creagenEditor.vcs.head ? creagenEditor.vcs.head : null,
  )
  const [history, setHistory] = useState<[ID, Generation][]>([])
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    creagenEditor.vcs
      .history(HISTORY_SIZE)
      .then((history) => {
        setHistory(history)
      })
      .catch(logger.error)

    creagenEditor.on('render', () => {
      if (activeIdRef.current !== creagenEditor.vcs.head) {
        console.debug('Updating history')
        activeIdRef.current = creagenEditor.vcs.head
        creagenEditor.vcs
          .history(HISTORY_SIZE)
          .then((history) => {
            setHistory(history)
          })
          .catch(logger.error)
      }
    })
  }, [])

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
    if (history.length <= 1) return null

    return history.map(([id, _gen], index) => (
      <React.Fragment key={`chain-${id.toString()}`}>
        {id === creagenEditor.vcs.head ? (
          <Chip color="primary" size="small" label={id.toSub()} />
        ) : (
          <Typography
            variant="body2"
            component="span"
            sx={{
              cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                textDecoration: 'underline',
              },
            }}
            onClick={() => {
              creagenEditor.loadCode(id)
            }}
          >
            {id.toSub()}
          </Typography>
        )}
        {index < history.length - 1 && (
          <ArrowLeft fontSize="small" color="action" />
        )}
      </React.Fragment>
    ))
  }

  return (
    <Box sx={{ position: 'relative', minHeight: 20 }}>
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
            <ExpandLess fontSize="small" />
          ) : (
            <ExpandMore fontSize="small" />
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
            maxHeight: expanded ? 'none' : '30px',
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              padding: 0.2,
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
