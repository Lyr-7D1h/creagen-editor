import { Alert, AlertColor, Stack, CircularProgress } from '@mui/material'
import React, { JSX, useEffect, useState } from 'react'
import { AUTOHIDE_DURATION_DEFAULT, Message, Severity, logger } from './logger'

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
  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({})
  const updateInterval = 50

  useEffect(() => {
    const unsubscribe = logger.subscribe((alerts) => {
      setLogs(alerts)

      // add new logs to timeLeft
      setTimeLeft((prev) => {
        const updated = { ...prev }
        Object.values(alerts).forEach((msg) => {
          const id = msg.id
          if (
            typeof updated[id] === 'undefined' &&
            msg.autoHideDuration !== null
          ) {
            updated[id] = msg.autoHideDuration ?? AUTOHIDE_DURATION_DEFAULT
          }
        })
        return updated
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (logs.length === 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const updated = { ...prev }

        Object.keys(updated).forEach((id) => {
          const log = logs.find((log) => log.id === id)
          // remove log if it doesn't exist anymore
          if (typeof log === 'undefined') {
            delete updated[id]
            return
          }

          const duration = log.autoHideDuration ?? AUTOHIDE_DURATION_DEFAULT
          const decrementValue = 100 / (duration / updateInterval)
          updated[id] = Math.max(0, updated[id]! - decrementValue)
        })

        return updated
      })
    }, updateInterval)

    return () => clearInterval(interval)
  }, [logs])

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
        sx={{ minWidth: '250px' }}
        onClose={() => handleClose(log.id)}
        icon={
          log.autoHideDuration !== null && (
            <CircularProgress
              variant="determinate"
              value={100 - (timeLeft[log.id] || 0)}
              size={20}
              thickness={5}
              sx={{ mr: 1, color: 'rgba(0, 0, 0, 0.3)' }}
            />
          )
        }
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
