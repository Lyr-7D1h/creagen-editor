class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}
interface FetchOptions extends RequestInit {
  timeout?: number
}
// Wrapper function for fetch
export async function fetch(
  url: string,
  options?: FetchOptions,
): Promise<Response> {
  const timeout = options?.timeout ?? 5000
  let controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  let resp
  try {
    resp = await window.fetch(url, { signal: controller.signal })
  } catch (e) {
    let error = e as Error
    if (error.name === 'AbortError')
      throw new TimeoutError(
        `Request exceeded ${Math.round(timeout / 1000)}s timeout`,
      )
    throw e
  }
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url} ${resp.status}`)
  }
  return resp
}
