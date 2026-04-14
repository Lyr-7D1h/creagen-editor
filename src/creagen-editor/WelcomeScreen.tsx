import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material'
import { useWelcome } from '../events/useEditorEvents'
import { editorEvents } from '../events/events'
import { isMobile } from './isMobile'

export function WelcomeScreen() {
  const open = useWelcome()

  function handleClose() {
    editorEvents.emit('welcome', false)
  }

  const mobile = isMobile()
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)' } } }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-start',
          paddingTop: '15vh',
        },
      }}
    >
      <DialogTitle>Welcome to Creagen Editor!</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This is a creative coding web editor with a focus on being minimal,
          customizable, fast and powerful. Its goal is to provide easy
          accessibility to make and share creative coding projects.
        </DialogContentText>
        <Typography variant="h6" sx={{ mt: 2 }}>
          Getting Started
        </Typography>
        <DialogContentText component="div">
          {mobile ? (
            <ol>
              <li>
                To run the current code, tap the button in the top right corner.
              </li>
              <li>
                Open the <b>Menu</b> to view saved changes, settings, and other
                project options.
              </li>
            </ol>
          ) : (
            <ol>
              <li>Write Code</li>
              <li>
                Press <b>Control+Shift+Enter</b> to render code or{' '}
                <b>press the top right button</b>
              </li>
              <li>
                In the <b>Menu</b>{' '}
                <span style={{ color: 'grey', fontSize: '0.9rem' }}>
                  (Sideways arrow in the top left corner)
                </span>
                : Add dependencies, Look at saved changes, Change keybindings,
                change settings and more
              </li>
            </ol>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  )
}
