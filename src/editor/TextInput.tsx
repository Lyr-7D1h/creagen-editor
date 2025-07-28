import React, { useState } from 'react'

export function TextInput({
  onSave,
  onClose,
  initialValue,
}: {
  onSave: (value: string) => void
  onClose: () => void
  initialValue: string
}) {
  const [value, setValue] = useState(initialValue)

  const onChange = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(value)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      onKeyDown={onChange}
      autoFocus
      style={{
        color: 'inherit',
        flex: 1,
        textAlign: 'center',
        border: 'none',
        outline: 'none',
        fontWeight: 'light',
        background: 'transparent',
        fontFamily: 'inherit',
      }}
    />
  )
}
