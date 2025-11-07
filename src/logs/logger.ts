export const AUTOHIDE_DURATION_DEFAULT = 6000
export enum Severity {
  Success = 5,
  Error = 4,
  Warning = 3,
  Info = 2,
  Debug = 1,
  Trace = 0,
}

export type Message = {
  id: MessageId
  message: string
  severity: Severity
  autoHideDuration?: number | null
}

export type MessageId = string

function formatMsg(msg: unknown[]): string {
  return msg
    .map((m) => {
      if (m instanceof Error) {
        return m.message
      } else if (typeof m !== 'string') {
        return JSON.stringify(m)
      } else {
        return m
      }
    })
    .join(' ')
}

let ALERTS: Message[] = []
let LISTENERS: Array<(alerts: Message[]) => void> = []

// Module-level functions for all logger operations
export function getMessages(): Message[] {
  return [...ALERTS]
}

export function log(
  severity: Severity,
  message: string,
  /** Set to null if you want to control when to remove the log */
  autoHideDuration?: number | null,
): MessageId {
  if (CREAGEN_LOG_LEVEL > (severity as number)) return ''
  if (typeof autoHideDuration === 'undefined')
    // eslint-disable-next-line no-param-reassign
    autoHideDuration = AUTOHIDE_DURATION_DEFAULT
  const id = Date.now().toString(36) + Math.random().toString(36).substring(4)
  const newAlert = { id, message, severity, autoHideDuration }

  ALERTS = [...ALERTS, newAlert]
  notifyListeners()

  // Auto-remove after duration if specified
  if (autoHideDuration !== null && autoHideDuration > 0) {
    setTimeout(() => {
      remove(id)
    }, autoHideDuration)
  }

  return id
}

export function remove(id: MessageId): void {
  ALERTS = ALERTS.filter((alert) => alert.id !== id)
  notifyListeners()
}

export function subscribe(listener: (alerts: Message[]) => void): () => void {
  LISTENERS = [...LISTENERS, listener]

  return () => {
    LISTENERS = LISTENERS.filter((l) => l !== listener)
  }
}

export function clear(): void {
  ALERTS = []
  notifyListeners()
}

function notifyListeners(): void {
  LISTENERS.forEach((listener) => listener(getMessages()))
}

function genericLogger(context?: string) {
  return {
    getMessages,
    log,
    remove,
    subscribe,
    clear,
    trace: (...msg: unknown[]) => {
      if (CREAGEN_LOG_LEVEL > 0) return ''

      if (context != null) {
        // eslint-disable-next-line no-console
        console.debug(`[${context}]`, ...msg)
      } else {
        // eslint-disable-next-line no-console
        console.debug(...msg)
      }
      return ''
    },
    debug: (...msg: unknown[]) => {
      if (CREAGEN_LOG_LEVEL > 1) return ''
      if (context != null) {
        // eslint-disable-next-line no-console
        console.debug(`[${context}]`, ...msg)
      } else {
        // eslint-disable-next-line no-console
        console.debug(...msg)
      }
      if (CREAGEN_MODE === 'dev') {
        return log(Severity.Debug, formatMsg(msg))
      }
      return ''
    },
    info: (...msg: unknown[]) => {
      if (CREAGEN_LOG_LEVEL > 2) return ''
      if (context != null) {
        // eslint-disable-next-line no-console
        console.info(`[${context}]`, ...msg)
      } else {
        // eslint-disable-next-line no-console
        console.info(...msg)
      }
      return log(Severity.Info, formatMsg(msg))
    },
    warn: (...msg: unknown[]) => {
      if (CREAGEN_LOG_LEVEL > 3) return ''
      if (context != null) {
        console.warn(`[${context}]`, ...msg)
      } else {
        console.warn(...msg)
      }
      return log(Severity.Warning, formatMsg(msg))
    },
    error: (...msg: unknown[]) => {
      if (CREAGEN_LOG_LEVEL > 4) return ''
      if (context != null) {
        console.error(`[${context}]`, ...msg)
      } else {
        console.error(...msg)
      }
      return log(Severity.Error, formatMsg(msg))
    },
  }
}

export function createContextLogger(context: string) {
  return genericLogger(context)
}

export const logger = genericLogger()
