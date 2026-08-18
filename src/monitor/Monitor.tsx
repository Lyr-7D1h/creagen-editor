import { Paper } from '@mui/material'
import { useSettings } from '../events/useEditorEvents'
import { MonitorCoordinatesSection } from './MonitorCoordinatesSection'
import { MonitorPerformanceSection } from './MonitorPerformanceSection'

export function Monitor() {
  const resourceMonitorEnabled = useSettings('sandbox.resource_monitor')
  const coordinatesEnabled = useSettings('sandbox.coordinates')

  if (!resourceMonitorEnabled && !coordinatesEnabled) return null

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 24,
        right: 8,
        zIndex: 5,
        minWidth: 160,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        backdropFilter: 'blur(4px)',
      }}
    >
      {coordinatesEnabled && <MonitorCoordinatesSection />}
      {resourceMonitorEnabled && <MonitorPerformanceSection />}
    </Paper>
  )
}
