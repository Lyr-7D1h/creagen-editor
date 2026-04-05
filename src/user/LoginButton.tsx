import { localStorage } from '../storage/LocalStorage'
import { Button } from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import React, { useMemo, useState } from 'react'
import { LoginModal } from './LoginModal'
import { AccountModal } from './AccountModal'
import { parseJwtPayload } from './jwt'

export function LoginButton() {
  const [open, setOpen] = useState(false)
  const [initialMode, setInitialMode] = useState<'login' | 'signup'>('login')
  const [token, setToken] = useState<string | null>(
    localStorage.get('creagen-auth-token'),
  )
  const user = useMemo(
    () => (token != null ? parseJwtPayload(token) : null),
    [token],
  )

  if (CREAGEN_REMOTE_URL == null) return null

  const isLoggedIn = token !== null

  function handleLoginSuccess(newToken: string) {
    localStorage.set('creagen-auth-token', newToken)
    setToken(newToken)
  }

  function handleLogout() {
    localStorage.remove('creagen-auth-token')
    setToken(null)
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
        onClick={() => (isLoggedIn ? setOpen(true) : openWithMode('login'))}
        sx={{ fontSize: '0.7rem', py: 0.25, px: 1, mr: 0.25 }}
        startIcon={<AccountCircleIcon sx={{ fontSize: '1rem !important' }} />}
      >
        {isLoggedIn ? (user?.sub ?? 'Account') : 'Login'}
      </Button>
      {!isLoggedIn && (
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
      {isLoggedIn && user != null ? (
        <AccountModal
          open={open}
          onClose={() => setOpen(false)}
          username={user.sub}
          iat={user.iat}
          exp={user.exp}
          onLogout={handleLogout}
        />
      ) : (
        <LoginModal
          open={open}
          onClose={() => setOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          initialMode={initialMode}
        />
      )}
    </>
  )
}
