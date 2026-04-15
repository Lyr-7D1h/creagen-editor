type SendError = (error: Error) => void

export type ScheduledTaskController = {
  reset: () => void
}

export function createScheduledTaskController(
  sendError: SendError,
): ScheduledTaskController {
  const originalRequestAnimationFrame =
    window.requestAnimationFrame.bind(window)
  const originalCancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  let rafActive = true
  const rafHandles = new Set<number>()

  window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    if (!rafActive) return -1
    const wrapped: FrameRequestCallback = (time) => {
      // requestAnimationFrame is one-shot: remove handle once callback fires.
      rafHandles.delete(id)
      if (!rafActive) return
      try {
        cb(time)
      } catch (e) {
        sendError(e as Error)
      }
    }
    const id = originalRequestAnimationFrame(wrapped)
    rafHandles.add(id)
    return id
  }

  window.cancelAnimationFrame = (id: number) => {
    rafHandles.delete(id)
    return originalCancelAnimationFrame(id)
  }

  const originalSetTimeout = window.setTimeout.bind(window)
  const originalClearTimeout = window.clearTimeout.bind(window)
  const originalSetInterval = window.setInterval.bind(window)
  const originalClearInterval = window.clearInterval.bind(window)
  let timersActive = true
  const timeoutHandles = new Set<number>()
  const intervalHandles = new Set<number>()

  const patchedSetTimeout = ((
    cb: TimerHandler,
    ms?: number,
    ...args: unknown[]
  ) => {
    if (!timersActive) return -1
    const wrapped = () => {
      // setTimeout is one-shot: remove handle once callback fires.
      timeoutHandles.delete(id)
      if (!timersActive) return
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (typeof cb === 'function') cb(...args)
        else eval(String(cb))
      } catch (e) {
        sendError(e as Error)
      }
    }
    const id = originalSetTimeout(wrapped, ms)
    timeoutHandles.add(id)
    return id
  }) as unknown as typeof window.setTimeout

  const patchedClearTimeout = ((id?: number | string) => {
    if (typeof id === 'number') {
      timeoutHandles.delete(id)
    }
    return originalClearTimeout(id as number | undefined)
  }) as unknown as typeof window.clearTimeout

  const patchedSetInterval = ((
    cb: TimerHandler,
    ms?: number,
    ...args: unknown[]
  ) => {
    if (!timersActive) return -1
    const wrapped = () => {
      if (!timersActive) return
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (typeof cb === 'function') cb(...args)
        else eval(String(cb))
      } catch (e) {
        sendError(e as Error)
      }
    }
    const id = originalSetInterval(wrapped, ms)
    intervalHandles.add(id)
    return id
  }) as unknown as typeof window.setInterval

  const patchedClearInterval = ((id?: number | string) => {
    if (typeof id === 'number') {
      intervalHandles.delete(id)
    }
    return originalClearInterval(id as number | undefined)
  }) as unknown as typeof window.clearInterval

  window.setTimeout = patchedSetTimeout
  window.clearTimeout = patchedClearTimeout
  window.setInterval = patchedSetInterval
  window.clearInterval = patchedClearInterval

  const reset = () => {
    // Prevent new callbacks from running while cancelling active handles.
    rafActive = false
    timersActive = false

    for (const id of rafHandles) {
      try {
        originalCancelAnimationFrame(id)
      } catch {
        // ignore cancellation errors
      }
    }
    rafHandles.clear()

    for (const id of timeoutHandles) {
      try {
        originalClearTimeout(id)
      } catch {
        // ignore cancellation errors
      }
    }
    timeoutHandles.clear()

    for (const id of intervalHandles) {
      try {
        originalClearInterval(id)
      } catch {
        // ignore cancellation errors
      }
    }
    intervalHandles.clear()

    // Re-enable scheduling for the next render.
    rafActive = true
    timersActive = true
  }

  return { reset }
}
