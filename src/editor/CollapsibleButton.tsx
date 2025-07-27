import { ChevronRight } from '@mui/icons-material'
import { Tooltip, IconButton } from '@mui/material'
import React from 'react'

export function CollapsibleButton({
  tooltipOpen,
  tooltipClose,
  open,
  onClick,
}: {
  tooltipOpen?: string
  tooltipClose?: string
  open: boolean
  onClick: () => void
}) {
  const button = (
    <IconButton
      sx={{
        padding: 0,
        margin: 0,
      }}
      onClick={onClick}
      size="small"
    >
      <ChevronRight
        sx={{
          transform: open ? 'rotate(270deg)' : 'rotate(90deg)',
          transition: 'transform 0.3s',
        }}
      />
    </IconButton>
  )

  if (tooltipClose && tooltipOpen)
    return (
      <Tooltip title={open ? tooltipClose : tooltipOpen} placement="right">
        {button}
      </Tooltip>
    )

  return button
}
