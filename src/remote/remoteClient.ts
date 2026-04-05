import createClient, { type Client } from 'openapi-fetch'
import type { paths } from './storage'

export const remoteClient =
  CREAGEN_REMOTE_URL != null
    ? createClient<paths>({
        baseUrl: CREAGEN_REMOTE_URL,
      })
    : null

export type RemoteClient = Client<paths>
