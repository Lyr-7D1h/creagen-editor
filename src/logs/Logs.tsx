import { Alert, AlertColor, Stack } from '@mui/material'
import React, { JSX, useEffect, useState } from 'react'
import { Message, logger } from './logger'

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
    if (severity === 'debug') severity = 'info'
    Alerts.push(
      <Alert
        key={log.id}
        severity={log.severity as AlertColor}
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
