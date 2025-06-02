import React, { useState } from 'react'
import { Typography } from '@mui/material'
import { useSettings } from '../settings/SettingsProvider'
import { logger } from '../logs/logger'

export function EditableProjectName({ onUpdate }: { onUpdate: () => void }) {
  const settings = useSettings()
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [projectNameValue, setProjectNameValue] = useState('')

  const handleProjectNameClick = () => {
    setProjectNameValue(settings.values['general.project_name'])
    setIsEditingProjectName(true)
  }

  const handleProjectNameSave = () => {
    if (projectNameValue.length < 3) {
      logger.error('Name must have at least 3 characters')
      return
    }
    if (projectNameValue.length > 40) {
      logger.error('Name must be less than 40 characters')
      return
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(projectNameValue)) {
      logger.error('Name can only contain letters, numbers, and spaces')
      return
    }
    settings.set('general.project_name', projectNameValue)
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
          value={projectNameValue}
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
          {settings.values['general.project_name'].length > 30
            ? settings.values['general.project_name'].substring(0, 30) + '...'
            : settings.values['general.project_name']}
        </Typography>
      )}
    </>
  )
}
