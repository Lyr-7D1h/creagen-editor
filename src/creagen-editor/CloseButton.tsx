import { Close as CloseIcon } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import React from 'react'

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <IconButton
      onClick={onClose}
      size="small"
      sx={{
        p: 0.5,
        ml: 0.5,
      }}
      title="Close"
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  )
}
