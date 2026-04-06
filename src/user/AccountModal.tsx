import React from 'react'
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { parseJwtPayload } from './jwt'

interface AccountModalProps {
  open: boolean
  onClose: () => void
  username: string
  token?: string
  onLogout: () => void
}

export function AccountModal({
  open,
  onClose,
  username,
  token,
  onLogout,
}: AccountModalProps) {
  const payload = typeof token !== 'undefined' ? parseJwtPayload(token) : null

  function handleLogout() {
    onLogout()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)' } } }}
    >
      <DialogTitle sx={{ pb: 0 }}>Account</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ py: 2, alignItems: 'center' }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
            <AccountCircleIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6">{username}</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={0.75}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Logged in since
            </Typography>
            <Typography variant="body2">
              {payload ? new Date(payload.iat * 1000).toLocaleString() : '—'}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Session expires
            </Typography>
            <Typography variant="body2">
              {payload ? new Date(payload.exp * 1000).toLocaleString() : '—'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small">
          Close
        </Button>
        <Button
          onClick={handleLogout}
          size="small"
          color="error"
          variant="outlined"
        >
          Log out
        </Button>
      </DialogActions>
    </Dialog>
  )
}
