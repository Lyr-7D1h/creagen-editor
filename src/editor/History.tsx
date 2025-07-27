import { useState, useEffect, useRef } from 'react'
import { logger } from '../logs/logger'
import React from 'react'
import Box from '@mui/material/Box'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import {
  Chip,
  Typography,
  IconButton,
  Collapse,
  Stack,
  SxProps,
  Theme,
} from '@mui/material'
import ArrowLeft from '@mui/icons-material/ArrowLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useSettings } from '../events/useEditorEvents'
import { HistoryItem } from '../vcs/VCS'
import { editorEvents } from '../events/events'
import { CollapsibleButton } from './CollapsibleButton'
import { HtmlTooltip } from './HtmlTooltip'
import { Add } from '@mui/icons-material'
import { EditableText } from './EditableText'
import { bookmarkNameSchema } from '../vcs/Bookmarks'

function AddBookmarkButton() {
  return (
    <HtmlTooltip title="Add bookmark">
      <IconButton
        sx={{
          padding: 0,
          margin: 0,
          color: 'inherit',
        }}
        size="small"
      >
        <Add
          sx={{
            width: '1.1rem',
            height: '1.1rem',
          }}
        />
      </IconButton>
    </HtmlTooltip>
  )
}

function HistoryItemChip({
  item,
  head,
}: {
  item: HistoryItem
  head: string | null
}) {
  const creagenEditor = useCreagenEditor()
  const vcs = creagenEditor.vcs
  const [collapsed, setCollapsed] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const { bookmarks, commit } = item
  const label = (
    <HtmlTooltip
      title={
        <div>
          {bookmarks.map((bm) => (
            <Typography key={bm.name} color="inherit">
              {bm.name}
            </Typography>
          ))}
          <em>{commit.toHex()}</em>
        </div>
      }
    >
      <span>
        {bookmarks.length > 0 ? (
          <EditableText
            onEdit={(v) => setIsEditing(v)}
            onSave={(name) => {
              const data = bookmarkNameSchema.safeParse(name)
              if (data.success === false) {
                logger.error(data.error)
                return false
              }
              vcs.renameBookmark(bookmarks[0]!.name, name)
              return true
            }}
            value={bookmarks[0]!.name}
          />
        ) : (
          commit.toSub()
        )}
      </span>
    </HtmlTooltip>
  )

  const actions = isEditing ? (
    <></>
  ) : bookmarks.length > 1 ? (
    <CollapsibleButton
      open={collapsed === commit.hash.toHex()}
      onClick={() => {}}
    />
  ) : (
    <AddBookmarkButton />
  )
  return (
    <React.Fragment key={commit.hash.toHex()}>
      {(head ? commit.hash.toHex() === head : false) ? (
        <Chip
          color="primary"
          size="small"
          label={label}
          onDelete={() => {
            setCollapsed(
              collapsed === commit.hash.toHex() ? null : commit.hash.toHex(),
            )
          }}
          deleteIcon={actions}
          sx={{
            '& .MuiChip-label': {
              paddingRight: '2px',
            },
          }}
        />
      ) : (
        <div
          style={{
            color: 'grey',
          }}
        >
          <Typography
            variant="body2"
            component="span"
            sx={{
              cursor: 'pointer',
              color: 'text.secondary',
              lineHeight: 2,
              '&:hover': {
                color: 'primary.main',
                textDecoration: 'underline',
              },
            }}
            onClick={() => {
              creagenEditor.checkout(commit.hash)
            }}
          >
            {label}
          </Typography>
          {actions}
        </div>
      )}
    </React.Fragment>
  )
}

const HISTORY_SIZE = 10
export function History({
  height,
  style,
}: {
  height?: string
  style?: SxProps<Theme>
}) {
  const creagenEditor = useCreagenEditor()
  const [head, setHead] = useState<string | null>(
    creagenEditor.vcs.head ? creagenEditor.vcs.head.toHex() : null,
  )
  const historyEnabled = useSettings('editor.show_history')
  const [history, setHistory] = useState<HistoryItem[]>([])
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
  }, [])

  useEffect(() => {
    const updateHistory = () => {
      const currentHead: string | null = creagenEditor.vcs.head
        ? creagenEditor.vcs.head.hash.toHex()
        : null

      if (head !== currentHead) {
        setHead(currentHead)

        // if current history already includes change don't change history
        if (history.some(({ commit: id }) => id.toString() === currentHead)) {
          return
        }

        creagenEditor.vcs
          .history(HISTORY_SIZE)
          .then((history) => {
            setHistory(history)
          })
          .catch(logger.error)
      }
    }

    return editorEvents.on('vcs:checkout', updateHistory)
  }, [creagenEditor.vcs.head, head, history])

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
        <HistoryItemChip item={item} head={head} />
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
