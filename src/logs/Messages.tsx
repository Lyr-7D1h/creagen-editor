import { Alert, AlertColor, Stack, LinearProgress } from '@mui/material'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
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

const MessageChip = React.memo(
  ({
    log,
    progress,
    onClose,
  }: {
    log: Message
    progress: number
    onClose: (id: string) => void
  }) => {
    const handleClose = useCallback(() => onClose(log.id), [log.id, onClose])

    let severity = log.severity
    if (severity === Severity.Debug) severity = Severity.Info

    return (
      <Alert
        severity={severityToAlertColor(severity)}
        sx={{
          minWidth: '250px',
          position: 'relative',
          overflow: 'hidden',
          py: 0.25,
        }}
        onClose={handleClose}
      >
        {log.autoHideDuration !== null && (
          <LinearProgress
            variant="determinate"
            value={100 - progress}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
            }}
          />
        )}
        {log.message}
      </Alert>
    )
  },
)

export function Messages() {
  const [logs, setLogs] = useState<Message[]>(logger.getMessages())
  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({})
  const updateInterval = 200

  useEffect(() => {
    const unsubscribe = logger.subscribe((alerts) => {
      setLogs(alerts)

      setTimeLeft((prev) => {
        const updated = { ...prev }
        Object.values(alerts).forEach((msg) => {
          const id = msg.id
          if (
            typeof updated[id] === 'undefined' &&
            msg.autoHideDuration !== null
          ) {
            updated[id] = 100
          }
        })
        return updated
      })
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (logs.length === 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const updated = { ...prev }
        let hasChanges = false

        Object.keys(updated).forEach((id) => {
          const log = logs.find((log) => log.id === id)
          if (typeof log === 'undefined') {
            delete updated[id]
            hasChanges = true
            return
          }

          const duration = log.autoHideDuration ?? AUTOHIDE_DURATION_DEFAULT
          const decrementValue = 100 / (duration / updateInterval)
          const newValue = Math.max(0, updated[id]! - decrementValue)

          if (updated[id] !== newValue) {
            updated[id] = newValue
            hasChanges = true
          }
        })

        return hasChanges ? updated : prev
      })
    }, updateInterval)

    return () => clearInterval(interval)
  }, [logs, updateInterval])

  const handleClose = useCallback((id: string) => {
    logger.remove(id)
  }, [])

  // Memoize the alerts to prevent recreation
  const alerts = useMemo(() => {
    return logs.map((log) => {
      const progress =
        log.autoHideDuration !== null ? 100 - (timeLeft[log.id] || 0) : 0

      return (
        <MessageChip
          key={log.id}
          log={log}
          progress={progress}
          onClose={handleClose}
        />
      )
    })
  }, [logs, timeLeft, handleClose])

  if (logs.length === 0) return null

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'absolute',
        top: '0',
        left: '50%',
        zIndex: 1003,
        maxWidth: '100%',
        width: 'auto',
        maxHeight: '100vh',
        overflowY: 'auto',
      }}
    >
      {alerts}
    </Stack>
  )
}
