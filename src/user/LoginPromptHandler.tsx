import React, { useState } from 'react'
import { LoginModal } from './LoginModal'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { RemoteClientStorage } from '../storage/RemoteClientStorage'
import { editorEvents } from '../events/events'

export function LoginPromptHandler() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const storage = useCreagenEditor().storage as RemoteClientStorage

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
