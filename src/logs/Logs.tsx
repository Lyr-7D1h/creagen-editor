import { Alert, AlertColor, Stack } from '@mui/material'
import React, { JSX, useEffect, useState } from 'react'
import { Message, Severity, logger } from './logger'

function severityToAlertColor(severity: Severity): AlertColor {
  switch (severity) {
    case Severity.Error:
      return 'error'
    case Severity.Warning:
      return 'warning'
    case Severity.Info:
      return 'info'
    case Severity.Debug:
      return 'info'
    default:
      return 'info'
  }
}

export function Logs() {
  const [logs, setLogs] = useState<Message[]>(logger.getMessages())

  useEffect(() => {
    const unsubscribe = logger.subscribe((alerts) => {
      setLogs(alerts)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const handleClose = (id: string) => {
    logger.remove(id)
  }

  if (logs.length === 0) return null

  const Alerts: JSX.Element[] = []

  for (const log of logs) {
    let severity = log.severity
    // TODO: custom debug color
    if (severity === Severity.Debug) severity = Severity.Info
    Alerts.push(
      <Alert
        key={log.id}
        severity={severityToAlertColor(severity)}
        onClose={() => handleClose(log.id)}
        sx={{ minWidth: '250px' }}
      >
        {log.message}
      </Alert>,
    )
  }

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 2000,
        maxWidth: '100%',
        width: 'auto',
        maxHeight: '100vh',
        overflowY: 'auto',
      }}
    >
      {Alerts}
    </Stack>
  )
}
