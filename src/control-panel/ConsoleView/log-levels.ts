import type { LogLevel } from '../../sandbox/SandboxLog'

/** All filterable log levels (excludes `uncaught` — always visible). */
export const ALL_LEVEL_FILTERS: LogLevel[] = ['error', 'warn', 'info', 'debug']

/** Counts used as the initial state when the log is reset. */
export const ZERO_COUNTS = {
  warn: 0,
  error: 0,
}
