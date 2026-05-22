import { Add } from '@mui/icons-material'
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
          padding: '1px',
          margin: 0,
          color: 'inherit',
          width: '16px',
          height: '16px',
          '&:hover': {
            backgroundColor: 'darkgray',
          },
        }}
        size="small"
      >
        <Add sx={{ fontSize: '12px' }} />
      </IconButton>
    </HtmlTooltip>
  )
}
