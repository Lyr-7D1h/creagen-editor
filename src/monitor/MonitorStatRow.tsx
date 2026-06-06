import { Box, Typography } from '@mui/material'

export function StatRow({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{ fontFamily: 'monospace', fontWeight: 'bold', color }}
      >
        {value}
      </Typography>
    </Box>
  )
}
