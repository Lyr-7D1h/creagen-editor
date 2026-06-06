import { Stack } from '@mui/material'
import { useEffect, useState } from 'react'
import { editorEvents } from '../events/events'
import { StatRow } from './MonitorStatRow'

export function MonitorCoordinatesSection() {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    return editorEvents.on('sandbox:mouse-move', setCoords)
  }, [])

  return (
    <Stack
      spacing={0.5}
      sx={{
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <StatRow label="x:" value={coords !== null ? String(coords.x) : '—'} />
      <StatRow label="y:" value={coords !== null ? String(coords.y) : '—'} />
    </Stack>
  )
}
