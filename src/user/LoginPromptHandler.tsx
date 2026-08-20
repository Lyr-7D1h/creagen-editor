import React, { useState } from 'react'
import { LoginModal } from './LoginModal'
import { editorEvents } from '../events/events'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'


export function LoginPromptHandler() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const storage = useCreagenEditor().storage

  React.useEffect(() => {
    return editorEvents.on('login-prompt', (data) => {
      setMessage(data.message ?? null)
      setOpen(true)
    })
  }, [])

  return (
    <LoginModal
      open={open}
      onClose={() => {
        setOpen(false)
        setMessage(null)
      }}
      login={storage.login.bind(storage)}
      message={message}
    />
  )
}
