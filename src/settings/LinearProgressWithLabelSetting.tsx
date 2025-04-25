import {
  LinearProgressProps,
  Box,
  LinearProgress,
  Typography,
} from '@mui/material'
import React from 'react'

export function LinearProgressWithLabelSetting({
  value,
  minLabel,
  maxLabel,
  ...props
}: LinearProgressProps & {
  value: number
  minLabel: string
  maxLabel: string
}) {
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {minLabel}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {maxLabel}
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flex: 1, width: '100%', mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={value}
            {...props}
            sx={{ height: 24 }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: 35,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary' }}
          >{`${value}%`}</Typography>
        </Box>
      </Box>
    </Box>
  )
}
