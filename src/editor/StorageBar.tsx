import {
  LinearProgressProps,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { roundToDec } from '../util'
import { logger } from '../logs/logger'

function LinearProgressWithLabelSetting({
  value,
  minLabel,
  maxLabel,
  current,
  max,
  ...props
}: LinearProgressProps & {
  value: number
  minLabel: string
  maxLabel: string
  current: number
  max: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  const toGB = (bytes: number) => `${roundToDec(bytes / 1000000000, 3)}GB`
  return (
    <Box
      sx={{ width: '100%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flex: 1, width: '100%' }}>
          <LinearProgress
            variant="determinate"
            value={value}
            {...props}
            sx={{ height: 24 }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            left: 8,
            color: 'text.secondary',
            lineHeight: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          {minLabel}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            right: 8,
            color: 'text.secondary',
            lineHeight: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          {maxLabel}
        </Typography>
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
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isHovered ? toGB(current) : `${value}%`}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export function StorageBar() {
  const [storage, setStorage] = useState<Storage | null>(null)
  useEffect(() => {
    navigator.storage
      .estimate()
      .then((storage) =>
        setStorage({
          current: storage.usage ?? 0,
          max: storage.quota ?? 1,
        }),
      )
      .catch(logger.error)
  }, [])

  return (
    <LinearProgressWithLabelSetting
      minLabel="0GB"
      maxLabel={`${storage ? roundToDec(storage.max / 1000000000, 3) : 0}GB`}
      variant="determinate"
      value={roundToDec(storage ? (storage.current / storage.max) * 100 : 0, 3)}
      current={storage?.current ?? 0}
      max={storage?.max ?? 1}
    />
  )
}

type Storage = {
  current: number
  max: number
}
