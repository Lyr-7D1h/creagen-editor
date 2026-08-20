import createClient, { type Client } from 'openapi-fetch'
import type { operations, paths } from './storage'

export const remoteClient = (baseUrl: string) =>
  createClient<paths>({
    baseUrl,
  })

export type StoredCommit =
  operations['get_CommitFetch']['responses']['200']['content']['application/json']['commit']
export type User =
  operations['post_UserLogin']['responses']['200']['content']['application/json']['user']
export type RemoteClient = Client<paths>

/** Parse response, returning null in case of 404 */
export function unwrapDataResponse<T>(r: {
  data?: T
  error?: unknown
  response: Response
}): T | null {
  if (r.response.status === 404) return null
  return unwrapResponse(r)
}

export function unwrapResponse<T>({
  data,
  error,
}: {
  data?: T
  error?: unknown
}): T {
  if (data === undefined || error !== undefined) {
    const msg =
      (error as { error?: { message?: string } } | undefined)?.error?.message ??
      'Request failed'
    throw new Error(msg)
  }
  return data
}
