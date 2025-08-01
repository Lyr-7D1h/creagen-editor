import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import React from 'react'
import { useWelcome } from '../events/useEditorEvents'
import { editorEvents } from '../events/events'

export function WelcomeScreen() {
  const open = useWelcome()

  function handleClose() {
    editorEvents.emit('welcome', false)
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Welcome to the Creagen Editor</DialogTitle>
      <DialogContent>
        <DialogContentText>
          A creative coding web editor with focus on being minimal,
          customizable, fast and powerful. Its goal is to provide easy
          accessibility to make creative coding projects.
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
