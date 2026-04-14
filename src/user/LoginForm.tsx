import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  InputAdornment,
  TextField,
} from '@mui/material'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Turnstile } from './Turnstile'

interface LoginFormProps {
  error: string | null
  successMessage: string | null
  loading: boolean
  onClose: () => void
  onSubmit: (username: string, password: string, turnstileToken: string) => void
}

export function LoginForm({
  error,
  successMessage,
  loading,
  onClose,
  onSubmit,
}: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const isValid =
    username.length >= 3 &&
    username.length <= 32 &&
    password.length >= 8 &&
    password.length <= 128 &&
    turnstileToken != null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (turnstileToken == null) return
        onSubmit(username, password, turnstileToken)
      }}
    >
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error != null && <Alert severity="error">{error}</Alert>}
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
            autoComplete="current-password"
            size="small"
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
          <Turnstile
            siteKey={CREAGEN_TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !isValid}
        >
          Log in
        </Button>
      </DialogActions>
    </form>
  )
}
