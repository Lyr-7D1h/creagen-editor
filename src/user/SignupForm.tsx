import React, { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Turnstile } from './Turnstile'

interface PasswordStrength {
  score: number
  label: string
  color: 'error' | 'warning' | 'success'
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { score: score * 20, label: 'Weak', color: 'error' }
  if (score <= 3) return { score: score * 20, label: 'Fair', color: 'warning' }
  return { score: score * 20, label: 'Strong', color: 'success' }
}

interface SignupFormProps {
  error: string | null
  successMessage: string | null
  loading: boolean
  onClose: () => void
  onSubmit: (username: string, password: string, turnstileToken: string) => void
}

export function SignupForm({
  error,
  successMessage,
  loading,
  onClose,
  onSubmit,
}: SignupFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const passwordStrength =
    password.length > 0 ? getPasswordStrength(password) : null
  const passwordMismatch =
    repeatPassword.length > 0 && password !== repeatPassword

  const isValid =
    /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/.test(username) &&
    username.length >= 3 &&
    username.length <= 32 &&
    password.length >= 8 &&
    password.length <= 128 &&
    password === repeatPassword &&
    turnstileToken != null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (password !== repeatPassword) {
      setLocalError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }
    if (turnstileToken == null) return
    onSubmit(username, password, turnstileToken)
  }

  const displayError = localError ?? error

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {displayError != null && (
            <Alert severity="error">{displayError}</Alert>
          )}
          {successMessage != null && (
            <Alert severity="success">{successMessage}</Alert>
          )}
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
            autoFocus
            autoComplete="username"
            size="small"
            error={username.length > 0 && username.length < 3}
            helperText={
              username.length > 0 && username.length < 3
                ? 'Username must be at least 3 characters'
                : undefined
            }
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            autoComplete="new-password"
            size="small"
            error={password.length > 0 && password.length < 8}
            helperText={
              password.length > 0 && password.length < 8
                ? 'Password must be at least 8 characters'
                : undefined
            }
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {passwordStrength != null && (
            <Box sx={{ mt: -1 }}>
              <LinearProgress
                variant="determinate"
                value={passwordStrength.score}
                color={passwordStrength.color}
                sx={{ borderRadius: 1, height: 5 }}
              />
              <Typography
                variant="caption"
                color={`${passwordStrength.color}.main`}
              >
                {passwordStrength.label}
              </Typography>
            </Box>
          )}
          <TextField
            label="Repeat password"
            type="password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            fullWidth
            required
            autoComplete="new-password"
            size="small"
            error={passwordMismatch}
            helperText={passwordMismatch ? 'Passwords do not match' : undefined}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {CREAGEN_TURNSTILE_SITE_KEY != null && (
            <Turnstile
              siteKey={CREAGEN_TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !isValid}
        >
          Sign up
        </Button>
      </DialogActions>
    </form>
  )
}
