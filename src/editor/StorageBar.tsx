import {
  LinearProgressProps,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { roundToDec } from '../util'
import { logger } from '../logs/logger'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { useLogin } from '../events/useEditorEvents'

function LinearProgressWithLabelSetting({
  value,
  minLabel,
  maxLabel,
  current,
  ...props
}: LinearProgressProps & {
  value: number
  minLabel: string
  maxLabel: string
  current: number
}) {
  const [isHovered, setIsHovered] = useState(false)
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
            {isHovered ? formatBytes(current) : `${value}%`}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

function formatBytes(bytes: number) {
  if (bytes >= 1e12) return `${roundToDec(bytes / 1e12, 3)}TB`
  if (bytes >= 1e9) return `${roundToDec(bytes / 1e9, 2)}GB`
  if (bytes >= 1e6) return `${roundToDec(bytes / 1e6, 0)}MB`
  if (bytes >= 1e3) return `${roundToDec(bytes / 1e3, 0)}KB`
  return `${bytes}B`
}

export function StorageBar() {
  const creagenEditor = useCreagenEditor()
  const [usageEstimation, setUsageEstimation] = useState<Storage | null>(null)
  const user = useLogin()
  useEffect(() => {
    creagenEditor.storage
      .estimateUsage()
      .then((storage) =>
        setUsageEstimation({
          current: storage.usage ?? 0,
          max: storage.quota ?? 1,
        }),
      )
      .catch(logger.error)
  }, [creagenEditor, user])

  return (
    <LinearProgressWithLabelSetting
      minLabel="0B"
      maxLabel={usageEstimation ? formatBytes(usageEstimation.max) : '0B'}
      variant="determinate"
      value={roundToDec(
        usageEstimation
          ? (usageEstimation.current / usageEstimation.max) * 100
          : 0,
        3,
      )}
      current={usageEstimation?.current ?? 0}
    />
  )
}

type Storage = {
  current: number
  max: number
}
