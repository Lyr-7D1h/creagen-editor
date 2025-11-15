import React, { useState, useEffect } from 'react'
import {
  Paper,
  IconButton,
  Collapse,
  Typography,
  Box,
  Stack,
} from '@mui/material'
import { ExpandMore, ExpandLess } from '@mui/icons-material'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'

interface PerformanceStats {
  averageFPS: number
  averageFrameTime: number
  maxFrameTime: number
  minFrameTime: number
}

export function PerformanceMonitor() {
  const creagenEditor = useCreagenEditor()
  const [isExpanded, setIsExpanded] = useState(true)
  const [stats, setStats] = useState<PerformanceStats>({
    averageFPS: 0,
    averageFrameTime: 0,
    maxFrameTime: 0,
    minFrameTime: 0,
  })

  useEffect(() => {
    const id = setInterval(() => {
      const currentStats = creagenEditor.resourceMonitor.getStats()
      setStats({
        averageFPS: currentStats.averageFPS,
        averageFrameTime: currentStats.averageFrameTime,
        maxFrameTime: currentStats.maxFrameTime,
        minFrameTime: currentStats.minFrameTime,
      })
    }, 500)

    return () => {
      clearInterval(id)
    }
  }, [creagenEditor.resourceMonitor])

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 5,
        minWidth: 160,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          borderBottom: isExpanded ? '1px solid' : 'none',
          borderColor: 'divider',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 'bold',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          >
            Performance
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              FPS:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                color:
                  stats.averageFPS > 55
                    ? 'success.main'
                    : stats.averageFPS > 30
                      ? 'warning.main'
                      : 'error.main',
              }}
            >
              {stats.averageFPS.toFixed(1)}
            </Typography>
          </Box>
        )}
        <IconButton
          size="small"
          sx={{
            p: 0,
            width: 20,
            height: 20,
          }}
        >
          {isExpanded ? (
            <ExpandLess sx={{ fontSize: 16 }} />
          ) : (
            <ExpandMore sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Stack
          spacing={0.5}
          sx={{
            px: 1.5,
            py: 1,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
          }}
        >
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
              FPS:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color:
                  stats.averageFPS > 55
                    ? 'success.main'
                    : stats.averageFPS > 30
                      ? 'warning.main'
                      : 'error.main',
              }}
            >
              {stats.averageFPS.toFixed(1)}
            </Typography>
          </Box>

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
              Avg Frame:
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
            >
              {stats.averageFrameTime.toFixed(1)}ms
            </Typography>
          </Box>

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
              Min:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                color: 'success.main',
              }}
            >
              {stats.minFrameTime.toFixed(1)}ms
            </Typography>
          </Box>

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
              Max:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                color:
                  stats.maxFrameTime < 20
                    ? 'success.main'
                    : stats.maxFrameTime < 50
                      ? 'warning.main'
                      : 'error.main',
              }}
            >
              {stats.maxFrameTime.toFixed(1)}ms
            </Typography>
          </Box>
        </Stack>
      </Collapse>
    </Paper>
  )
}
