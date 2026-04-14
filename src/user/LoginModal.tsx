import React, { useState } from 'react'
import { Dialog, DialogTitle, Tab, Tabs } from '@mui/material'
import { remoteClient } from '../remote/remoteClient'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

type Mode = 'login' | 'signup'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  message?: string | null
  login: (
    username: string,
    password: string,
    turnstileToken: string,
  ) => Promise<true | string>
  initialMode?: Mode
}

export function LoginModal({
  open,
  onClose,
  message,
  login,
  initialMode = 'login',
}: LoginModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleModeChange(_: React.SyntheticEvent, newMode: Mode) {
    setMode(newMode)
    setError(null)
    setSuccessMessage(null)
  }

  React.useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  function handleClose() {
    setError(null)
    setSuccessMessage(null)
    onClose()
  }

  async function handleLoginSubmit(
    username: string,
    password: string,
    turnstileToken: string,
  ) {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const result = await login(username, password, turnstileToken)
      if (result !== true) {
        setError(result)
        return
      }
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignupSubmit(
    username: string,
    password: string,
    turnstileToken: string,
  ) {
    if (remoteClient == null) return

    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const { error: apiError, response } = await remoteClient.POST(
        '/api/register',
        {
          body: {
            username,
            password,
            turnstileToken,
          },
        },
      )
      if (!response.ok) {
        const msg =
          (apiError as { error?: { message?: string } } | undefined)?.error
            ?.message ?? 'Registration failed'
        setError(msg)
        return
      }
      setSuccessMessage('Account created! You can now log in.')
      setMode('login')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)' } } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Tabs value={mode} onChange={handleModeChange}>
          <Tab label="Log in" value="login" />
          <Tab label="Sign up" value="signup" />
        </Tabs>
      </DialogTitle>

      {mode === 'login' ? (
        <LoginForm
          error={error}
          message={message ?? null}
          successMessage={successMessage}
          loading={loading}
          onClose={handleClose}
          onSubmit={(username, password, turnstileToken) => {
            void handleLoginSubmit(username, password, turnstileToken)
          }}
        />
      ) : (
        <SignupForm
          error={error}
          successMessage={successMessage}
          loading={loading}
          onClose={handleClose}
          onSubmit={(username, password, turnstileToken) => {
            void handleSignupSubmit(username, password, turnstileToken)
          }}
        />
      )}
    </Dialog>
  )
}
