import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { IconButton } from '@mui/material'
import React from 'react'

export function CollapseButton({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean
  onCollapse: () => void
}) {
  return (
    <IconButton
      onClick={onCollapse}
      size="small"
      sx={{
        p: 0.5,
        ml: 0.5,
        zIndex: 99999,
      }}
      title={collapsed ? 'Expand' : 'Collapse'}
    >
      {collapsed ? (
        <ExpandLessIcon fontSize="small" />
      ) : (
        <ExpandMoreIcon fontSize="small" />
      )}
    </IconButton>
  )
}
