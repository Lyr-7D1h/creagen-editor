import React, { useState } from 'react'
import { Typography } from '@mui/material'
import { logger } from '../logs/logger'
import { useActiveBookmark } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { TextInput } from './TextInput'
import { bookmarkNameSchema } from '../vcs/Bookmarks'

export function ActiveBookmark({ onUpdate }: { onUpdate: () => void }) {
  const vcs = useCreagenEditor().vcs
  const activeBookmark = useActiveBookmark()
  const [isEditing, setIsEditing] = useState(false)

  const onSave = async (value: string) => {
    console.log(value)
    const data = bookmarkNameSchema.safeParse(value)
    if (data.success === false) {
      logger.error(data.error)
      return
    }
    if ((await vcs.renameBookmark(activeBookmark.name, value)) === null) {
      return
    }
    setIsEditing(false)

    // ensure update after render
    setTimeout(() => {
      onUpdate()
    }, 0)
  }

  const uncommitted = activeBookmark.commit === null ? '*' : ''
  return (
    <>
      <Typography
        variant="body1"
        onClick={() => setIsEditing(true)}
        sx={{
          color: '#111',
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
