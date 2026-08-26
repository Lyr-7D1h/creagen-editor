import type { Middleware } from 'openapi-fetch'
import createClient, { type Client } from 'openapi-fetch'
import { logger } from '../logs/logger'
import { localStorage } from '../storage/LocalStorage'
import { parseJwtPayload } from '../user/jwt'
import { promptLogin } from '../user/promptLogin'
import type { operations, paths } from './storage'

/** The in-flight refresh, so at most one refresh request is ever made */
let refreshPromise: Promise<string | null> | null = null
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise != null) return refreshPromise
  refreshPromise = refreshAccessTokenInner()
  try {
    return await refreshPromise
  } finally {
    // clear so a *subsequent* expired token triggers a new refresh;
    // concurrent callers that arrived before this settled still share it
    refreshPromise = null
  }
}

async function refreshAccessTokenInner() {
  const refreshToken = localStorage.get('creagen-refresh-token')
  if (!refreshToken) return null
  try {
    const res = await client.POST('/api/refresh', {
      body: { refreshToken },
    })
    if (res.response.status === 200 && res.data != null) {
      localStorage.set('creagen-access-token', res.data.token)
      localStorage.set('creagen-refresh-token', res.data.refreshToken)
      return res.data.token
    }
  } catch (e) {
    logger.error('Failed to refresh token', e)
  }
  return null
}

export function clearTokens() {
  localStorage.remove('creagen-access-token')
  localStorage.remove('creagen-refresh-token')
  currentAccessToken = null
}

/**
 * Get the current access token of an user
 *
 * NOTE: might not be valid
 */
export function getAccessToken() {
  return currentAccessToken ?? localStorage.get('creagen-access-token')
}

/** The cached current access token */
let currentAccessToken: string | null = null
export const authMiddleware: Middleware = {
  async onRequest({ request, schemaPath }) {
    // If not an auth endpoint skip
    if (!schemaPath.startsWith('/api/user')) {
      return request
    }

    let accessToken = getAccessToken()
    // access token doesn't exist skip
    if (accessToken == null) {
      promptLogin('You need to login for this operation')
      return request
    }
    // if access token exists but not valid try to refresh it
    const payload = parseJwtPayload(accessToken)
    // if not valid in the next 5 seconds already try to refresh
    if (payload === null || payload.exp < Date.now() / 1000 + 5) {
      accessToken = await refreshAccessToken()
      // if failed remove tokens and prompt login
      if (!accessToken) {
        clearTokens()
        promptLogin('You need to login for this operation')
        return request
      }
    }

    currentAccessToken = accessToken
    request.headers.set('Authorization', `Bearer ${accessToken}`)
    return request
  },
}

let client: RemoteClient
/** Create a remote client, ensure it is only called once */
export const remoteClient = (baseUrl: string) => {
  client = createClient<paths>({
    baseUrl,
  })
  return client
}

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
