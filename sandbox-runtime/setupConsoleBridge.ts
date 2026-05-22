import type { SandboxMessageHandler } from '../src/sandbox/SandboxMessageHandler'
import { serializeForPostMessage } from './serializeForPostMessage'

export function setupConsoleBridge(
  messageHandler: SandboxMessageHandler,
): void {
  const sendLog = (
    level: 'debug' | 'info' | 'warn' | 'error',
    args: unknown[],
  ) => {
    try {
      messageHandler.send({
        type: 'log',
        level,
        data: serializeForPostMessage(args),
      })
    } catch {
      // Fall back to strings when postMessage data is not cloneable.
      messageHandler.send({
        type: 'log',
        level,
        data: args.map((arg) => {
          try {
            return String(arg)
          } catch {
            return `[${typeof arg}]`
          }
        }),
      })
    }
  }

  try {
    window.console = {
      ...window.console,
      debug: (...args) => sendLog('debug', args),
      info: (...args) => sendLog('info', args),
      log: (...args) => sendLog('info', args),
      error: (...args) => sendLog('error', args),
      assert: (condition?: boolean, ...args: unknown[]) => {
        if (!condition) {
          // When assertion fails, send as error with "Assertion failed" prefix
          // This mimics the browser's native console.assert behavior
          const prefix = 'Assertion failed:'
          const message = args.length > 0 ? [prefix, ...args] : [prefix]
          sendLog('error', message)
        }
      },
    }
  } catch (error) {
    messageHandler.send({ type: 'error', error: error as Error })
  }
}
