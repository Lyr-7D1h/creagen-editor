import type React from 'react';
import { useState } from 'react'

export function TextInput({
  onSave,
  onClose,
  initialValue,
  style,
}: {
  onSave: (value: string) => void
  onClose: () => void
  initialValue: string
  style?: React.CSSProperties
}) {
  const [value, setValue] = useState(initialValue)

  function handleOnSave(value: string) {
    // don't save if nothing changed
    if (value === initialValue) {
      onClose()
      return
    }
    onSave(value)
  }

  const onChange = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleOnSave(value)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => handleOnSave(value)}
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
        // Keep the input from imposing a browser-default min-height that
        // would stretch the editor bar; 18px fits within both bar modes.
        height: 18,
        lineHeight: '18px',
        padding: 0,
        boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}
