import { Add, ChevronRight } from '@mui/icons-material'
import {
  IconButton,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material'
import { useState, useRef } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { useActiveBookmark } from '../events/useEditorEvents'
import { logger } from '../logs/logger'
import { bookmarkNameSchema, Bookmark } from '../vcs/Bookmarks'
import { HistoryItem } from '../vcs/VCS'
import { TextInput } from './TextInput'
import { HtmlTooltip } from './HtmlTooltip'
import React from 'react'
import { dateString, timeAgoString } from '../util'

interface BookmarkMenuProps {
  bookmarks: Bookmark[]
  anchorEl: null | HTMLElement
  open: boolean
  onClose: () => void
  onBookmarkSelect: (bookmarkName: string) => void
  onCreateBookmark: () => void
}

function BookmarkMenu({
  bookmarks,
  anchorEl,
  open,
  onClose,
  onBookmarkSelect,
  onCreateBookmark,
}: BookmarkMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      slotProps={{
        paper: {
          style: {
            maxHeight: 200,
            minWidth: 120,
          },
        },
      }}
    >
      {bookmarks.map((bookmark) => (
        <MenuItem
          key={bookmark.name}
          onClick={() => onBookmarkSelect(bookmark.name)}
          sx={{ fontSize: '0.75rem', padding: '4px 8px' }}
        >
          {bookmark.name}
        </MenuItem>
      ))}
      <Divider />
      <MenuItem
        onClick={onCreateBookmark}
        sx={{ fontSize: '0.75rem', padding: '4px 8px' }}
      >
        <Add sx={{ fontSize: '12px', marginRight: '4px' }} />
        New bookmark
      </MenuItem>
    </Menu>
  )
}

function AddBookmarkButton({ onClick }: { onClick: () => void }) {
  return (
    <HtmlTooltip title="Add bookmark">
      <IconButton
        onClick={onClick}
        sx={{
          padding: '1px',
          margin: 0,
          color: 'inherit',
          width: '16px',
          height: '16px',
          '&:hover': {
            backgroundColor: 'darkgray',
          },
        }}
        size="small"
      >
        <Add sx={{ fontSize: '12px' }} />
      </IconButton>
    </HtmlTooltip>
  )
}

function CollapsibleButton({
  open,
  onClick,
}: {
  open: boolean
  onClick: () => void
}) {
  return (
    <IconButton
      sx={{
        padding: '1px',
        margin: 0,
        color: 'inherit',
        width: '16px',
        height: '16px',
        '&:hover': {
          backgroundColor: 'darkgray',
        },
      }}
      onClick={onClick}
      size="small"
    >
      <ChevronRight
        sx={{
          fontSize: '12px',
          transform: open ? 'rotate(270deg)' : 'rotate(90deg)',
          transition: 'transform 0.3s',
        }}
      />
    </IconButton>
  )
}

export function HistoryItemChip({ item }: { item: HistoryItem }) {
  const creagenEditor = useCreagenEditor()
  const activeBookmark = useActiveBookmark()
  const vcs = creagenEditor.vcs
  const chipRef = useRef<HTMLDivElement>(null)

  const [collapsed, setCollapsed] = useState(false)
  // if string it is editing
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  let { bookmarks, commit } = item
  bookmarks = bookmarks.filter((b) => b.name !== activeBookmark.name)
  const active = commit.hash.toHex() === activeBookmark.commit?.toHex()

  const label = (
    <VcsTooltip historyItem={item}>
      <Typography
        variant="body2"
        component="span"
        sx={{
          color: 'inherit',
          lineHeight: 2,
          ...(isEditing || active
            ? {}
            : {
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }),
        }}
        onClick={() => {
          if (isEditing === null) {
            creagenEditor.checkout(commit.hash)
          }
        }}
      >
        {isEditing !== null ? (
          <TextInput
            onClose={() => setIsEditing(null)}
            onSave={(name) => {
              const data = bookmarkNameSchema.safeParse(name)
              if (data.success === false) {
                logger.error(data.error)
                return
              }
              if (vcs.bookmarks.getBookmark(name) !== null) {
                logger.error('Bookmark already exists')
                return
              }
              vcs.addBookmark(name, commit.hash)
              setIsEditing(null)
            }}
            initialValue={isEditing}
          />
        ) : bookmarks.length > 0 ? (
          bookmarks[0]!.name
        ) : (
          commit.toSub()
        )}
      </Typography>
    </VcsTooltip>
  )

  const actions =
    isEditing !== null ? (
      <></>
    ) : bookmarks.length > 0 ? (
      <CollapsibleButton
        open={collapsed}
        onClick={() => {
          setCollapsed(!collapsed)
          setMenuAnchor(chipRef.current)
        }}
      />
    ) : (
      <AddBookmarkButton onClick={() => setIsEditing('')} />
    )

  const handleMenuClose = () => {
    setCollapsed(false)
    setMenuAnchor(null)
  }

  const handleBookmarkSelect = (bookmarkName: string) => {
    const bookmark = vcs.bookmarks.getBookmark(bookmarkName)
    if (bookmark) {
      creagenEditor.checkout(bookmark)
    }
    handleMenuClose()
  }

  const handleCreateBookmark = () => {
    handleMenuClose()
    // Small delay to ensure menu closes before starting edit mode
    setTimeout(() => {
      setIsEditing('')
    }, 10)
  }

  if (active || bookmarks.length > 0) {
    return (
      <>
        <Chip
          ref={chipRef}
          color={active ? 'primary' : 'default'}
          size="small"
          label={
            <>
              {label}
              {actions}
            </>
          }
          sx={{
            '& .MuiChip-label': {
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingRight: '2px',
              paddingLeft: '6px',
            },
            '& .MuiChip-deleteIcon': {
              margin: '0 2px 0 0',
            },
            height: '20px',
            fontSize: '0.75rem',
            alignItems: 'center',
          }}
        />
        {bookmarks.length > 0 && (
          <BookmarkMenu
            bookmarks={bookmarks}
            anchorEl={menuAnchor}
            open={collapsed && Boolean(menuAnchor)}
            onClose={handleMenuClose}
            onBookmarkSelect={handleBookmarkSelect}
            onCreateBookmark={handleCreateBookmark}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div
        ref={chipRef}
        style={{
          color: 'grey',
          display: 'flex',
          alignItems: 'center',
          height: '20px',
          gap: '2px',
          fontSize: '0.75rem',
        }}
      >
        {label}
        {actions}
      </div>
      {bookmarks.length > 0 && (
        <BookmarkMenu
          bookmarks={bookmarks}
          anchorEl={menuAnchor}
          open={collapsed && Boolean(menuAnchor)}
          onClose={handleMenuClose}
          onBookmarkSelect={handleBookmarkSelect}
          onCreateBookmark={handleCreateBookmark}
        />
      )}
    </>
  )
}

export function VcsTooltip({
  historyItem,
  children,
}: {
  historyItem: HistoryItem
  children: React.ReactElement
}) {
  const { commit, bookmarks } = historyItem

  const tooltip = (
    <div style={{ lineHeight: 1.5, position: 'relative' }}>
      <Typography textAlign="right" variant="body2" color="grey">
        {timeAgoString(commit.createdOn)} ({dateString(commit.createdOn)})
      </Typography>
      {bookmarks.map((bm) => (
        <Typography variant="body1" key={bm.name}>
          {bm.name}
        </Typography>
      ))}
      <Typography variant="body2">
        <em>{commit.toHex()}</em>
      </Typography>
    </div>
  )

  return <HtmlTooltip title={tooltip}>{children}</HtmlTooltip>
}
