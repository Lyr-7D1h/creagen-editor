import { ChevronUp, ChevronDown } from 'lucide-react'
import { Box, Collapse, IconButton, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { StatRow } from './MonitorStatRow'

interface PerformanceStats {
  averageFPS: number
  averageFrameTime: number
  maxFrameTime: number
  minFrameTime: number
}

export function MonitorPerformanceSection() {
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
      const s = creagenEditor.resourceMonitor.getStats()
      setStats({
        averageFPS: s.averageFPS,
        averageFrameTime: s.averageFrameTime,
        maxFrameTime: s.maxFrameTime,
        minFrameTime: s.minFrameTime,
      })
    }, 500)

    return () => clearInterval(id)
  }, [creagenEditor.resourceMonitor])

  const fpsColor =
    stats.averageFPS > 55
      ? 'success.main'
      : stats.averageFPS > 30
        ? 'warning.main'
        : 'error.main'

  return (
    <>
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
          '&:hover': { backgroundColor: 'action.hover' },
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                color: fpsColor,
              }}
            >
              {stats.averageFPS.toFixed(1)}
            </Typography>
          </Box>
        )}
        <IconButton size="small" sx={{ p: 0, width: 20, height: 20 }}>
          {isExpanded ? (
            <ChevronUp size={16}  />
          ) : (
            <ChevronDown size={16}  />
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
          <StatRow
            label="FPS:"
            value={stats.averageFPS.toFixed(1)}
            color={fpsColor}
          />
          <StatRow
            label="Avg Frame:"
            value={`${stats.averageFrameTime.toFixed(1)}ms`}
          />
          <StatRow
            label="Min:"
            value={`${stats.minFrameTime.toFixed(1)}ms`}
            color="success.main"
          />
          <StatRow
            label="Max:"
            value={`${stats.maxFrameTime.toFixed(1)}ms`}
            color={
              stats.maxFrameTime < 20
                ? 'success.main'
                : stats.maxFrameTime < 50
                  ? 'warning.main'
                  : 'error.main'
            }
          />
        </Stack>
      </Collapse>
    </>
  )
}
