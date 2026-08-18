import { X } from 'lucide-react'
import { IconButton } from '@mui/material'

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <IconButton
      onClick={onClose}
      size="small"
      sx={{
        p: 0.5,
      }}
      title="Close"
    >
      <X size={16} />
    </IconButton>
  )
}
