import React, { useState } from 'react'
import { Typography } from '@mui/material'
import { logger } from '../logs/logger'
import { useActiveBookmark } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

export function ActiveBookmark({ onUpdate }: { onUpdate: () => void }) {
  const vcs = useCreagenEditor().vcs
  const activeBookmark = useActiveBookmark()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState('')

  if (activeBookmark === null) return ''

  const handleOnClick = () => {
    setValue(activeBookmark.name)
    setIsEditing(true)
  }

  const onSave = async () => {
    if (value.length < 3) {
      logger.error('Name must have at least 3 characters')
      return
    }
    if (value.length > 40) {
      logger.error('Name must be less than 40 characters')
      return
    }
    if (!/^[a-zA-Z0-9\s\-_.,!@#$%^&*()+={}[\]:;"'<>?/\\|`~]+$/.test(value)) {
      logger.error('Name can only contain letters, numbers, and spaces')
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

  const handleOnKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  return (
    <>
      <Typography
        variant="body2"
        onClick={handleOnClick}
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
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onSave}
            onKeyDown={handleOnKeydown}
            autoFocus
            style={{
              flex: 1,
              textAlign: 'center',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'inherit',
            }}
          />
        ) : activeBookmark.name.length > 30 ? (
          activeBookmark.name.substring(0, 30) + '...'
        ) : (
          activeBookmark.name
        )}
      </Typography>
    </>
  )
}
