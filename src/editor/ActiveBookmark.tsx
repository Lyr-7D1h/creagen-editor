import React, { useState } from 'react'
import { Typography, Box } from '@mui/material'
import { logger } from '../logs/logger'
import { useActiveBookmark } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { TextInput } from './TextInput'

export function ActiveBookmark({ onUpdate }: { onUpdate: () => void }) {
  const vcs = useCreagenEditor().vcs
  const headBookmark = useActiveBookmark()
  const [isEditing, setIsEditing] = useState(false)
  const [bookmarkName, setBookmarkName] = useState('')

  if (headBookmark === null) return ''

  const handleBookmarkNameClick = () => {
    setBookmarkName(headBookmark.name)
    setIsEditing(true)
  }

  const handleBookmarkNameSave = async (newName: string) => {
    if (newName.length < 3) {
      logger.error('Name must have at least 3 characters')
      return
    }
    if (newName.length > 40) {
      logger.error('Name must be less than 40 characters')
      return
    }
    if (!/^[a-zA-Z0-9\s\-_.,!@#$%^&*()+={}[\]:;"'<>?/\\|`~]+$/.test(newName)) {
      logger.error('Name can only contain letters, numbers, and spaces')
      return
    }
    if ((await vcs.renameBookmark(headBookmark.name, newName)) === null) {
      return
    }
    setIsEditing(false)

    // ensure update after render
    setTimeout(() => {
      onUpdate()
    }, 0)
  }

  const handleBookmarkNameClose = () => {
    setIsEditing(false)
  }

  return (
    <Box
      sx={{
        backgroundColor: 'primary.main',
        borderRadius: 0.5,
        padding: 0.25,
        display: 'flex',
        alignItems: 'center',
        color: 'white',
      }}
    >
      <Typography
        variant="body2"
        onClick={handleBookmarkNameClick}
        sx={{
          cursor: 'pointer',
          paddingLeft: 0.25,
          paddingRight: 0.25,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 0.5,
          },
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {isEditing ? (
          <TextInput
            onSave={handleBookmarkNameSave}
            onClose={handleBookmarkNameClose}
            initialValue={bookmarkName}
          />
        ) : headBookmark.name.length > 30 ? (
          headBookmark.name.substring(0, 30) + '...'
        ) : (
          headBookmark.name
        )}
      </Typography>
    </Box>
  )
}
