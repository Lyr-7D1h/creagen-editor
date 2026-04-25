import { Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { bookmarkNameSchema } from 'versie'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { useActiveBookmark, useIsDirty } from '../events/useEditorEvents'
import { logger } from '../logs/logger'
import { TextInput } from './TextInput'

export function ActiveBookmark({ color }: { color?: string }) {
  const creagenEditor = useCreagenEditor()
  const activeBookmark = useActiveBookmark()
  const isDirty = useIsDirty(creagenEditor)
  const [isEditing, setIsEditing] = useState(false)

  function onSave(value: string) {
    const data = bookmarkNameSchema.safeParse(value)
    if (data.success === false) {
      logger.error(data.error)
      return
    }
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

  return (
    <>
      <Typography
        variant="body2"
        onClick={() => setIsEditing(true)}
        sx={{
          color: color ?? '#111',
          opacity: isUncommitted ? 0.7 : 1,
          fontSize: '0.95rem',
          cursor: 'pointer',
          paddingLeft: 1,
          paddingRight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          ...(isEditing
            ? {}
            : {
                '&:hover': {
                  backgroundColor: 'action.hover',
                  borderRadius: 1,
                },
              }),
        }}
      >
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
    </>
  )
}
