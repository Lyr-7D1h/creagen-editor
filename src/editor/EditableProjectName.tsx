import React, { useState } from 'react'
import { Typography } from '@mui/material'
import { logger } from '../logs/logger'
import { useActiveRef } from '../events/useEditorEvents'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

export function EditableProjectName({ onUpdate }: { onUpdate: () => void }) {
  const vcs = useCreagenEditor().vcs
  const headRef = useActiveRef()
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [headRefValue, setProjectNameValue] = useState('')

  if (headRef === null) return ''

  const handleProjectNameClick = () => {
    setProjectNameValue(headRef.name)
    setIsEditingProjectName(true)
  }

  const handleProjectNameSave = () => {
    if (headRefValue.length < 3) {
      logger.error('Name must have at least 3 characters')
      return
    }
    if (headRefValue.length > 40) {
      logger.error('Name must be less than 40 characters')
      return
    }
    if (
      !/^[a-zA-Z0-9\s\-_.,!@#$%^&*()+={}[\]:;"'<>?/\\|`~]+$/.test(headRefValue)
    ) {
      logger.error('Name can only contain letters, numbers, and spaces')
      return
    }
    vcs.renameRef(headRef.name, headRefValue)
    setIsEditingProjectName(false)

    // ensure update after render
    setTimeout(() => {
      onUpdate()
    }, 0)
  }

  const handleProjectNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleProjectNameSave()
    } else if (e.key === 'Escape') {
      setIsEditingProjectName(false)
    }
  }

  return (
    <>
      {isEditingProjectName ? (
        <input
          type="text"
          value={headRefValue}
          onChange={(e) => setProjectNameValue(e.target.value)}
          onBlur={handleProjectNameSave}
          onKeyDown={handleProjectNameKeyPress}
          autoFocus
          style={{
            flex: 1,
            textAlign: 'center',
            border: 'none',
            outline: 'none',
            fontSize: '1.25rem',
            fontWeight: 'light',
            background: 'transparent',
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <Typography
          variant="body1"
          onClick={handleProjectNameClick}
          sx={{
            color: '#111',
            cursor: 'pointer',
            paddingLeft: 1,
            '&:hover': {
              backgroundColor: 'action.hover',
              borderRadius: 1,
            },
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {headRef.name.length > 30
            ? headRef.name.substring(0, 30) + '...'
            : headRef.name}
        </Typography>
      )}
    </>
  )
}
