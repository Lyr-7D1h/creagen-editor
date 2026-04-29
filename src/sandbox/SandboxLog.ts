export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'uncaught'
export type Log = [LogLevel, unknown[]]

export class SandboxLog {
  readonly target = new EventTarget()
  private readonly maxSize: number
  /** Don't send update after this size */
  private buffer: Log[]
  /** The current amount of logs in buffer. Goes from 0-maxSize*/
  size = 0
  /** Running totals for levels that show a badge in the UI */
  readonly levelCounts = { warn: 0, error: 0 }
  /** Pointer to the next log index  */
  private head = 0
  /** Amount of logs waiting to be flushed */
  private flushSize = 0
  private rafId: number | null = null

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
    this.buffer = new Array<Log>(maxSize)
  }

  /** Go through a set of logs going from head-offset to size */
  *view(offset: number, size: number) {
    size = Math.min(this.size, size)
    const i =
      (((this.head - offset - size) % this.maxSize) + this.maxSize) %
      this.maxSize
    for (let j = 0; j < size; j++) {
      yield this.buffer[(i + j) % this.maxSize]
    }
  }

  addLog(level: LogLevel, ...args: unknown[]) {
    this.buffer[this.head] = [level, args]
    this.head = (this.head + 1) % this.maxSize
    if (level === 'warn') this.levelCounts.warn++
    else if (level === 'error' || level === 'uncaught') this.levelCounts.error++
    if (this.flushSize < this.maxSize) {
      this.flushSize++
    }
    if (this.size < this.maxSize) {
      this.size++
    }

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flush())
    }
  }

  onUpdate(callback: (batch: number) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<number>
      callback(customEvent.detail)
    }
    this.target.addEventListener('update', handler)
    return () => this.target.removeEventListener('update', handler)
  }

  onReset(callback: () => void): () => void {
    this.target.addEventListener('reset', callback)
    return () => this.target.removeEventListener('reset', callback)
  }

  reset() {
    this.head = 0
    this.size = 0
    this.flushSize = 0
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.levelCounts.warn = 0
    this.levelCounts.error = 0
    this.target.dispatchEvent(new CustomEvent('reset'))
  }

  private flush() {
    const tail = (this.head - this.flushSize + this.maxSize) % this.maxSize
    const batch: Log[] = []

    for (let i = 0; i < this.flushSize; i++) {
      batch.push(this.buffer[(tail + i) % this.maxSize]!)
    }

    this.target.dispatchEvent(new CustomEvent('batch', { detail: batch }))
    this.target.dispatchEvent(
      new CustomEvent('update', { detail: this.flushSize }),
    )
    this.flushSize = 0
    this.rafId = null
  }
}
