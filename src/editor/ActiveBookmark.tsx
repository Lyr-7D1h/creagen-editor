import { Typography, useTheme } from '@mui/material'
import { useMemo, useState } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { useActiveBookmark, useIsDirty } from '../events/useEditorEvents'
import { logger } from '../logs/logger'
import { AddBookmarkButton } from './AddBookmarkButton'
import { TextInput } from './TextInput'

export function ActiveBookmark({ color }: { color?: string }) {
  const creagenEditor = useCreagenEditor()
  const theme = useTheme()
  const activeBookmark = useActiveBookmark()
  const isDirty = useIsDirty(creagenEditor)
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingBookmark, setIsAddingBookmark] = useState(false)
  const hasUsername = Boolean(activeBookmark.username)

  function onSave(value: string) {
    creagenEditor
      .renameBookmark(activeBookmark.name, value)
      .then(() => {
        setIsEditing(false)
      })
      .catch(logger.error)
  }

  const isUncommitted = activeBookmark.commit === null
  const uncommittedMarker = useMemo(
    () =>
      isDirty ? (
        <Typography component="span" sx={{ color: 'text.disabled' }}>
          *
        </Typography>
      ) : null,
    [isDirty],
  )

  function handleAddBookmark() {
    if (creagenEditor.head && !isAddingBookmark) {
      setIsAddingBookmark(true)
      creagenEditor
        .addBookmark(
          creagenEditor.activeBookmark.name,
          creagenEditor.head.hash,
          new Date(),
        )
        .then(() => {
          setIsAddingBookmark(false)
        })
        .catch((error) => {
          logger.error(error)
          setIsAddingBookmark(false)
        })
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
      <Typography
        variant="body2"
        onClick={hasUsername ? undefined : () => setIsEditing(true)}
        sx={{
          color: color ?? 'text.primary',
          opacity: isUncommitted ? 0.7 : 1,
          fontSize: '0.95rem',
          cursor: hasUsername ? 'default' : 'pointer',
          paddingLeft: 1,
          paddingRight: .4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          ...(!hasUsername && !isEditing
            ? {
                '&:hover': {
                  backgroundColor: 'action.hover',
                  borderRadius: 1,
                },
              }
            : {}),
        }}
      >
        {hasUsername && (
          <Typography
            component="span"
            sx={{ color: 'text.disabled', fontSize: 'inherit' }}
          >
            {activeBookmark.username}/
          </Typography>
        )}
        {isEditing ? (
          <TextInput
            onSave={onSave}
            onClose={() => setIsEditing(false)}
            initialValue={activeBookmark.name}
          />
        ) : activeBookmark.name.length > 30 ? (
          <>
            {activeBookmark.name.substring(0, 30)}
            {uncommittedMarker}
            ...
          </>
        ) : (
          <>
            {activeBookmark.name}
            {uncommittedMarker}
          </>
        )}
      </Typography>
      {isUncommitted && activeBookmark.commit !== null && !isEditing && (
        <AddBookmarkButton
          onClick={handleAddBookmark}
          disabled={isAddingBookmark}
        />
      )}
    </div>
  )
}
