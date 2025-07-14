import React, { useState, useEffect, useCallback } from 'react'

function formatKey(key: string): string {
  return key
    .split('+')
    .map((part) => {
      switch (part.toLowerCase()) {
        case 'ctrl':
          return 'Ctrl'
        case 'shift':
          return 'Shift'
        case 'alt':
          return 'Alt'
        case 'meta':
        case 'cmd':
          return 'Cmd'
        default:
          return part.toUpperCase()
      }
    })
    .join(' + ')
}

interface KeyCaptureInputProps {
  value: string
  /** custom styling when keybind is custom */
  onCapture: (key: string) => void
  onCancel: () => void
}

export function KeyCaptureInput({
  value,
  onCapture,
  onCancel,
}: KeyCaptureInputProps) {
  const [capturedKey, setCapturedKey] = useState(value)
  const [isRecording, setIsRecording] = useState(true)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const { key, ctrlKey, altKey, shiftKey, metaKey } = event

      if (key === 'Escape') {
        setIsRecording(false)
        onCancel()
        return
      }

      if (key === 'Delete' || key === 'Backspace') {
        setCapturedKey('')
        return
      }

      if (key === 'Enter' && !ctrlKey && !altKey && !shiftKey && !metaKey) {
        onCapture(capturedKey)
        setIsRecording(false)
        return
      }

      const parts: string[] = []
      if (ctrlKey) parts.push('ctrl')
      if (altKey) parts.push('alt')
      if (shiftKey) parts.push('shift')
      if (metaKey) parts.push('meta')

      const lowerKey = key.toLowerCase()
      if (
        !['control', 'alt', 'shift', 'meta', 'os'].includes(lowerKey) &&
        !parts.includes(lowerKey)
      ) {
        parts.push(lowerKey)
      }

      const keyString = parts.join('+')
      setCapturedKey(keyString)
    },
    [capturedKey, onCapture, onCancel],
  )

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown, true)
    } else {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isRecording, handleKeyDown])

  if (isRecording) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <code
          style={{
            backgroundColor: '#e3f2fd',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #2196f3',
            minWidth: '120px',
            textAlign: 'center',
          }}
        >
          {formatKey(capturedKey) || 'Press keys...'}
        </code>
        <span style={{ fontSize: '12px', color: '#6c757d' }}>
          Press Enter to save, Esc to cancel, Delete to remove
        </span>
      </div>
    )
  }

  return null
}
