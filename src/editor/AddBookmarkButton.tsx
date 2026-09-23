import { Plus } from 'lucide-react'
import { IconButton } from '@mui/material'
import { HtmlTooltip } from './HtmlTooltip'

export function AddBookmarkButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <HtmlTooltip title="Add bookmark">
      <IconButton
        onClick={onClick}
        disabled={disabled}
        sx={{
          padding: 0,
          margin: 0,
          marginLeft: '-2px',
          color: 'inherit',
          width: '16px',
          height: '16px',
          '&:hover': {
            backgroundColor: 'darkgray',
          },
        }}
        size="small"
      >
        <Plus size={16}  />
      </IconButton>
    </HtmlTooltip>
  )
}
