import React, { useState } from 'react'
import { Typography } from '@mui/material'
import { useSettings } from '../settings/SettingsProvider'

export function EditableProjectName() {
  const settings = useSettings()
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [projectNameValue, setProjectNameValue] = useState('')

  const handleProjectNameClick = () => {
    setProjectNameValue(settings.values['general.project_name'])
    setIsEditingProjectName(true)
  }

  const handleProjectNameSave = () => {
    settings.set('general.project_name', projectNameValue)
    setIsEditingProjectName(false)
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
            textOverflow: 'ellipsis',
          }}
        >
          {settings.values['general.project_name']}
        </Typography>
      )}
    </>
  )
}
