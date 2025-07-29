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
        label={
          <>
            {label}
            {actions}
          </>
        }
        sx={{
          '& .MuiChip-label': {
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
    )
  }

  return (
    <div
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
  )
}
