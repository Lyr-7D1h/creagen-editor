import { Button } from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import React, { useState } from 'react'
import { LoginModal } from './LoginModal'
import { AccountModal } from './AccountModal'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { RemoteClientStorage } from '../storage/RemoteClientStorage'
import { useLogin } from '../events/useEditorEvents'

export function LoginButton() {
  // resolved in compile time
  if (CREAGEN_REMOTE_URL == null) return null
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [open, setOpen] = useState(false)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [initialMode, setInitialMode] = useState<'login' | 'signup'>('login')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const storage = useCreagenEditor().storage as RemoteClientStorage
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const user = useLogin()

  function handleLogout() {
    storage.logout()
  }

  function openWithMode(mode: 'login' | 'signup') {
    setInitialMode(mode)
    setOpen(true)
  }

  return (
    <>
      <Button
        size="small"
        variant="text"
        color="primary"
        onClick={() => (user ? setOpen(true) : openWithMode('login'))}
        sx={{ fontSize: '0.7rem', py: 0.25, px: 1, mr: 0.25 }}
        startIcon={<AccountCircleIcon sx={{ fontSize: '1rem !important' }} />}
      >
        {user?.username ?? 'Login'}
      </Button>
      {!user && (
        <Button
          size="small"
          variant="text"
          color="inherit"
          onClick={() => openWithMode('signup')}
          sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
          startIcon={<PersonAddIcon sx={{ fontSize: '1rem !important' }} />}
        >
          Sign up
        </Button>
      )}
      {user ? (
        <AccountModal
          open={open}
          onClose={() => setOpen(false)}
          username={user.username}
          token={storage.token}
          onLogout={handleLogout}
        />
      ) : (
        <LoginModal
          open={open}
          onClose={() => setOpen(false)}
          login={storage.login.bind(storage)}
          initialMode={initialMode}
        />
      )}
    </>
  )
}
