import { Button, useTheme } from '@mui/material'
import { LogIn, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LoginModal } from './LoginModal'
import { AccountModal } from './AccountModal'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import type { RemoteClientStorage } from '../storage/RemoteClientStorage'
import { logger } from '../logs/logger'

export function LoginButton() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [open, setOpen] = useState(false)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [initialMode, setInitialMode] = useState<'login' | 'signup'>('login')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const storage = useCreagenEditor().storage as RemoteClientStorage
  const user = storage.user
  const theme = useTheme()

  const buttonSx = useMemo(
    () => ({
      fontSize: '0.7rem',
      height: '100%',
      minHeight: 0,
      py: 0,
      px: 0.5,
      minWidth: 0,
       color: 'primary.main' as const,
      '& .MuiButton-startIcon': {
        marginRight: 0.5,
        marginLeft: -0.5,
        '& svg': {
          width: 16,
          height: 16,
        },
      },
    }),
    [ theme.palette.common.white, theme.palette.primary.main],
  )

  function handleLogout() {
    storage.logout().catch(logger.error)
  }

  function openWithMode(mode: 'login' | 'signup') {
    setInitialMode(mode)
    setOpen(true)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, height: '100%' }}>
      <Button
        size="small"
        variant="text"
        color="primary"
        onClick={() => (user ? setOpen(true) : openWithMode('login'))}
        sx={{
          ...buttonSx,
          mr: 0.25,
          // Match the active bookmark's text settings when showing a
          // username instead of the compact login button.
          ...(user && {
            typography: 'body2',
            fontSize: '0.95rem',
          }),
        }}
        startIcon={user ? undefined : <LogIn />}
      >
        {user?.username ?? 'Login'}
      </Button>
      {!user && (
        <Button
          size="small"
          variant="text"
          color="inherit"
          onClick={() => openWithMode('signup')}
          sx={buttonSx}
          startIcon={<UserPlus />}
        >
          Sign up
        </Button>
      )}
      {user ? (
        <AccountModal
          open={open}
          onClose={() => setOpen(false)}
          username={user.username}
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
    </div>
  )
}
