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
        zIndex: 99999999,
        left: 0,
        top: 0,
        width: 20,
        height: 20,
        padding: 0,
        margin: 0,
      }}
      onClick={onClick}
      size="small"
    >
      <ChevronRight
        sx={{
          transform: open ? 'rotate(180deg)' : 'none',
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
