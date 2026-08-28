import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'

interface AccountModalProps {
  open: boolean
  onClose: () => void
  username: string
  onLogout: () => void
}

export function AccountModal({
  open,
  onClose,
  username,
  onLogout,
}: AccountModalProps) {
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
          <Typography variant="h6">{username}</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
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
