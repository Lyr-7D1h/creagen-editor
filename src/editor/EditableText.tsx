import React, { useState } from 'react'
import { Typography } from '@mui/material'

export function EditableText({
  onSave,
  value: initialValue,
}: {
  onSave: (value: string) => boolean
  onEdit: (editing: boolean) => void
  value: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)

  const handleSave = async () => {
    if (onSave(value) === false) return
    setEditing(false)
  }

  const onChange = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  return (
    <>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={onChange}
          autoFocus
          style={{
            color: 'inherit',
            flex: 1,
            textAlign: 'center',
            border: 'none',
            outline: 'none',
            fontSize: '1rem',
            fontWeight: 'light',
            background: 'transparent',
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <Typography
          variant="body2"
          component="span"
          sx={{
            color: 'inherit',
            cursor: 'pointer',
            lineHeight: 2,
          }}
          onClick={() => setEditing(true)}
        >
          {value}
        </Typography>
      )}
    </>
  )
}
