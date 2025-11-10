import React, { useState } from 'react'
import { Typography } from '@mui/material'
import { logger } from '../logs/logger'
import { useActiveBookmark } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { TextInput } from './TextInput'
import { bookmarkNameSchema } from '../vcs/Bookmarks'

export function ActiveBookmark({ color }: { color?: string }) {
  const vcs = useCreagenEditor().vcs
  const activeBookmark = useActiveBookmark()
  const [isEditing, setIsEditing] = useState(false)

  function onSave(value: string) {
    const data = bookmarkNameSchema.safeParse(value)
    if (data.success === false) {
      logger.error(data.error)
      return
    }
    vcs
      .renameBookmark(activeBookmark.name, value)
      .then((v) => {
        if (v) setIsEditing(false)
      })
      .catch(logger.error)
  }

  const uncommitted = activeBookmark.commit === null ? '*' : ''
  return (
    <>
      <Typography
        variant="body2"
        onClick={() => setIsEditing(true)}
        sx={{
          color: color ?? '#111',
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
          activeBookmark.name.substring(0, 30) + uncommitted + '...'
        ) : (
          activeBookmark.name + uncommitted
        )}
      </Typography>
    </>
  )
}
