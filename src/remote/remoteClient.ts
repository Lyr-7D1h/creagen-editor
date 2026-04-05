import createClient, { type Client } from 'openapi-fetch'
import type { operations, paths } from './storage'

export const remoteClient =
  CREAGEN_REMOTE_URL != null
    ? createClient<paths>({
        baseUrl: CREAGEN_REMOTE_URL,
      })
    : null

export type User =
  operations['post_UserLogin']['responses']['200']['content']['application/json']['user']
export type RemoteClient = Client<paths>
