class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}
interface FetchOptions extends Omit<RequestInit, 'signal'> {
  timeout?: number
  /** will validate status code by default */
  validate?: boolean
}
// Wrapper function for fetch
export async function fetch(
  url: string,
  options?: FetchOptions,
): Promise<Response> {
  const validate = options?.validate ?? true
  const timeout = options?.timeout ?? 5000
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  let resp
  try {
    const { validate, ...fetchOpts } = options ?? {}
    resp = await window.fetch(url, { ...fetchOpts, signal: controller.signal })
  } catch (e) {
    const error = e as Error
    if (error.name === 'AbortError')
      throw new TimeoutError(
        `Request exceeded ${Math.round(timeout / 1000)}s timeout`,
      )
    throw e
  }
  if (validate && !resp.ok) {
    throw new Error(
      `Failed to fetch ${url} ${resp.status} - ${resp.statusText}`,
    )
  }
  return resp
}
