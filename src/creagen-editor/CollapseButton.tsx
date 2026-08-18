import {
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { IconButton } from '@mui/material'

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
      }}
      title={collapsed ? 'Expand' : 'Collapse'}
    >
      {collapsed ? (
        <ChevronUp size={16}  />
      ) : (
        <ChevronDown size={16}  />
      )}
    </IconButton>
  )
}
