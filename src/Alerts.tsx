import { Alert, AlertProps, Stack } from '@mui/material'
import React, { useEffect, useState } from 'react'

type AlertItem = {
  id: string
  message: string
  severity: AlertProps['severity']
  autoHideDuration?: number
}

class AlertManager {
  private static instance: AlertManager
  private alerts: AlertItem[] = []
  private listeners: Array<(alerts: AlertItem[]) => void> = []

  private constructor() {}

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager()
    }
    return AlertManager.instance
  }

  public getAlerts(): AlertItem[] {
    return [...this.alerts]
  }

  public addAlert(
    message: string,
    severity: AlertProps['severity'] = 'info',
    autoHideDuration: number = 6000,
  ): string {
    const id = Date.now().toString()
    const newAlert = { id, message, severity, autoHideDuration }

    this.alerts = [...this.alerts, newAlert]
    this.notifyListeners()

    // Auto-remove after duration if specified
    if (autoHideDuration > 0) {
      setTimeout(() => {
        this.removeAlert(id)
      }, autoHideDuration)
    }

    return id
  }

  public removeAlert(id: string): void {
    this.alerts = this.alerts.filter((alert) => alert.id !== id)
    this.notifyListeners()
  }

  public subscribe(listener: (alerts: AlertItem[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getAlerts()))
  }
}

// Export singleton instance
export const alertManager = AlertManager.getInstance()

// Functional component for displaying alerts
export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>(alertManager.getAlerts())

  useEffect(() => {
    const unsubscribe = alertManager.subscribe((alerts) => {
      setAlerts(alerts)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const handleClose = (id: string) => {
    alertManager.removeAlert(id)
  }

  if (alerts.length === 0) return null

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 2000,
        maxWidth: '100%',
        width: 'auto',
        maxHeight: '100vh',
        overflowY: 'auto',
      }}
    >
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          severity={alert.severity}
          onClose={() => handleClose(alert.id)}
          sx={{ minWidth: '250px' }}
        >
          {alert.message}
        </Alert>
      ))}
    </Stack>
  )
}
