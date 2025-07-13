import { MODE } from '../env'

export const AUTOHIDE_DURATION_DEFAULT = 6000
export enum Severity {
  Success,
  Info,
  Warning,
  Error,
  Debug,
  Trace,
}

export type Message = {
  id: MessageId
  message: string
  severity: Severity
  autoHideDuration?: number | null
}

export type MessageId = string

function formatMsg(msg: any[]): string {
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
  if (typeof autoHideDuration === 'undefined')
    autoHideDuration = AUTOHIDE_DURATION_DEFAULT
  const id = Date.now().toString()
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

// Logging convenience functions
export function info(...msg: any[]): MessageId {
  console.info(...msg)
  return log(Severity.Info, formatMsg(msg))
}

export function warn(...msg: any[]): MessageId {
  console.warn(...msg)
  return log(Severity.Warning, formatMsg(msg))
}

export function error(...msg: any[]): MessageId {
  console.error(...msg)
  return log(Severity.Error, formatMsg(msg))
}

export function debug(...msg: any[]): MessageId {
  console.debug(...msg)
  if (MODE === 'dev') {
    return log(Severity.Debug, formatMsg(msg))
  }
  return ''
}

export function trace(...msg: any[]): MessageId {
  console.debug(...msg)
  return ''
}

export function createContextLogger(context: string) {
  return {
    getMessages,
    log,
    remove,
    subscribe,
    clear,
    info: (...msg: any[]) => {
      console.info(`[${context}]`, ...msg)
      return log(Severity.Info, formatMsg(msg))
    },
    warn: (...msg: any[]) => {
      console.warn(`[${context}]`, ...msg)
      return log(Severity.Warning, formatMsg(msg))
    },
    error: (...msg: any[]) => {
      console.error(`[${context}]`, ...msg)
      return log(Severity.Error, formatMsg(msg))
    },
    debug: (...msg: any[]) => {
      console.debug(`[${context}]`, ...msg)
      if (MODE === 'dev') {
        return log(Severity.Debug, formatMsg(msg))
      }
      return ''
    },
    trace: (...msg: any[]) => {
      console.debug(`[${context}]`, ...msg)
      return ''
    },
  }
}

export const logger = {
  getMessages,
  log,
  remove,
  subscribe,
  clear,
  info,
  warn,
  error,
  debug,
  trace,
}
