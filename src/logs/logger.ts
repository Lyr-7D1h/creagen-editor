import { MODE } from '../env'

export type Severity = 'success' | 'info' | 'warning' | 'error' | 'debug'

export type Message = {
  id: MessageId
  message: string
  severity: Severity
  autoHideDuration?: number
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
class Logger {
  private static _instance: Logger
  private alerts: Message[] = []
  private listeners: Array<(alerts: Message[]) => void> = []

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger()
    }
    return Logger._instance
  }

  public getMessages(): Message[] {
    return [...this.alerts]
  }

  log(
    severity: Severity,
    message: string,
    autoHideDuration: number = 6000,
  ): MessageId {
    const id = Date.now().toString()
    const newAlert = { id, message, severity, autoHideDuration }

    this.alerts = [...this.alerts, newAlert]
    this.notifyListeners()

    // Auto-remove after duration if specified
    if (autoHideDuration > 0) {
      setTimeout(() => {
        this.remove(id)
      }, autoHideDuration)
    }

    return id
  }

  public remove(id: MessageId): void {
    this.alerts = this.alerts.filter((alert) => alert.id !== id)
    this.notifyListeners()
  }

  public subscribe(listener: (alerts: Message[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  info(...msg: any[]) {
    console.info(...msg)
    return this.log('info', formatMsg(msg))
  }
  warn(...msg: any[]) {
    console.warn(...msg)
    return this.log('warning', formatMsg(msg))
  }
  error(...msg: any[]) {
    console.error(...msg)
    return this.log('error', formatMsg(msg))
  }
  debug(...msg: any[]) {
    console.debug(...msg)
    if (MODE === 'dev') {
      return this.log('debug', formatMsg(msg))
    }
    return ''
  }

  clear() {
    this.alerts = []
    this.notifyListeners()
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getMessages()))
  }
}

export const logger = Logger.getInstance()
