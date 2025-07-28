import { Add, ChevronRight } from '@mui/icons-material'
import { IconButton, Typography, Chip } from '@mui/material'
import { useState } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { useActiveBookmark } from '../events/useEditorEvents'
import { logger } from '../logs/logger'
import { bookmarkNameSchema } from '../vcs/Bookmarks'
import { HistoryItem } from '../vcs/VCS'
import { TextInput } from './TextInput'
import { HtmlTooltip } from './HtmlTooltip'
import React from 'react'

function AddBookmarkButton({ onClick }: { onClick: () => void }) {
  return (
    <HtmlTooltip title="Add bookmark">
      <IconButton
        onClick={onClick}
        sx={{
          padding: 0,
          margin: 0,
          color: 'inherit',
          '&:hover': {
            backgroundColor: 'darkgray',
          },
        }}
        size="small"
      >
        <Add />
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
        padding: 0,
        margin: 0,
        color: 'inherit',
        '&:hover': {
          backgroundColor: 'darkgray',
        },
      }}
      onClick={onClick}
      size="small"
    >
      <ChevronRight
        sx={{
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

  const [collapsed, setCollapsed] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  let { bookmarks, commit } = item
  bookmarks = bookmarks.filter((b) => b.name !== activeBookmark.name)
  const active = commit.hash.toHex() === activeBookmark.commit?.toHex()

  const tooltip = (
    <div>
      {bookmarks.map((bm) => (
        <Typography key={bm.name}>{bm.name}</Typography>
      ))}
      <em>{commit.toHex()}</em>
    </div>
  )

  const label = (
    <HtmlTooltip title={tooltip}>
      <Typography
        variant="body2"
        component="span"
        sx={{
          cursor: 'pointer',
          color: 'inherit',
          lineHeight: 2,
          '&:hover': isEditing
            ? {}
            : active
              ? { color: 'lightgrey' }
              : {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
        }}
        onClick={() => {
          if (isEditing === false) {
            creagenEditor.checkout(commit.hash)
          }
        }}
      >
        {isEditing ? (
          <TextInput
            onClose={() => setIsEditing(false)}
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
              setIsEditing(false)
            }}
            initialValue={bookmarks[0]?.name ?? ''}
          />
        ) : bookmarks.length > 0 ? (
          bookmarks[0]!.name
        ) : (
          commit.toSub()
        )}
      </Typography>
    </HtmlTooltip>
  )

  const actions = isEditing ? (
    <></>
  ) : bookmarks.length > 0 ? (
    <CollapsibleButton open={collapsed} onClick={() => {}} />
  ) : (
    <AddBookmarkButton onClick={() => setIsEditing(true)} />
  )

  if (active || bookmarks.length > 0) {
    return (
      <Chip
        color={active ? 'primary' : 'default'}
        size="small"
        label={label}
        onDelete={() => {
          setCollapsed(!collapsed)
        }}
        deleteIcon={actions}
        sx={{
          '& .MuiChip-label': {
            paddingRight: '2px',
          },
          height: '24px',
          alignItems: 'center',
        }}
      />
    )
  }

  return (
    <div
      style={{
        color: 'grey',
        display: 'flex',
        alignItems: 'center',
        height: '24px',
        gap: '4px',
      }}
    >
      {label}
      {actions}
    </div>
  )
}
