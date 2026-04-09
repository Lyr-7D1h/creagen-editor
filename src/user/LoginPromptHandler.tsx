import React, { useState } from 'react'
import { LoginModal } from './LoginModal'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { RemoteClientStorage } from '../storage/RemoteClientStorage'
import { editorEvents } from '../events/events'

export function LoginPromptHandler() {
  const [open, setOpen] = useState(false)
  const storage = useCreagenEditor().storage as RemoteClientStorage

  React.useEffect(() => {
    return editorEvents.on('login-prompt', () => setOpen(true))
  }, [])

  return (
    <LoginModal
      open={open}
      onClose={() => setOpen(false)}
      login={storage.login.bind(storage)}
    />
  )
}
