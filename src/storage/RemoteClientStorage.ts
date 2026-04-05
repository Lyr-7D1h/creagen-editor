import { localStorage } from './LocalStorage'
import { CustomKeybinding } from '../creagen-editor/keybindings'
import { IndexDBStorage } from 'versie'
import type { Storage, CommitHash, BlobHash, Bookmark, Commit } from 'versie'
import { CommitMetadata } from '../creagen-editor/CommitMetadata'
import { remoteClient, RemoteClient, User } from '../remote/remoteClient'
import { parseJwtPayload } from '../user/jwt'
import { logger } from '../logs/logger'
import { editorEvents } from '../events/events'

/** Entry point for fetching all data */
export class RemoteClientStorage implements Storage<CommitMetadata> {
  private readonly remoteClient: RemoteClient
  token?: string
  user?: User

  private readonly authMiddleware = {
    onRequest: ({ request }: { request: Request }) => {
      if (this.token != null) {
        request.headers.set('Authorization', `Bearer ${this.token}`)
      }
      return request
    },
  }

  constructor(readonly indexdb: IndexDBStorage<CommitMetadata>) {
    if (remoteClient === null) {
      throw Error('No remote client configured')
    }
    this.remoteClient = remoteClient
    this.remoteClient.use(this.authMiddleware)

    const token = localStorage.get('creagen-auth-token')
    if (token === null) return
    const payload = parseJwtPayload(token)
    if (payload === null) return
    if (payload.exp < Date.now() / 1000) {
      localStorage.remove('creagen-auth-token')
      return
    }
    this.token = token
    this.remoteClient
      .GET('/api/profile')
      .then((res) => {
        this.user = unwrapResponse(res).user
        editorEvents.emit('login', undefined)
      })
      .catch((e) => {
        this.token = undefined
        logger.error(e)
      })
  }

  async login(username: string, password: string, turnstileToken: string) {
    try {
      const { user, token } = unwrapResponse(
        await this.remoteClient.POST('/login', {
          body: { username, password, turnstileToken },
        }),
      )
      localStorage.set('creagen-auth-token', token)
      this.token = token
      this.user = user
      editorEvents.emit('login', undefined)
      return true
    } catch (e) {
      return e instanceof Error ? e.message : 'Login failed'
    }
  }

  logout() {
    localStorage.remove('creagen-auth-token')
    this.token = undefined
    this.user = undefined
    editorEvents.emit('logout', undefined)
  }

  estimateUsage(): Promise<StorageEstimate> {
    if (!this.user)
      return Promise.resolve({
        quota: 1,
        usage: 0,
      })
    return Promise.resolve({
      quota: this.user.quotaBytesLimit,
      usage: this.user.quotaBytesUsed,
    })
  }

  /** TODO: get from api */
  setSettings(value: unknown) {
    return Promise.resolve(localStorage.set('settings', value))
  }
  getSettings() {
    return Promise.resolve(localStorage.get('settings'))
  }
  setCustomKeybindings(keybindings: CustomKeybinding[]) {
    return Promise.resolve(localStorage.set('custom-keybindings', keybindings))
  }
  getCustomKeybindings() {
    return Promise.resolve(localStorage.get('custom-keybindings'))
  }

  getCommit(id: CommitHash) {
    return this.indexdb.getCommit(id)
  }
  getCommitData(hash: BlobHash) {
    return this.indexdb.getCommitData(hash)
  }
  getCheckout(hash: CommitHash) {
    return this.indexdb.getCheckout(hash)
  }

  setCommit(commit: Commit<CommitMetadata>, data: Uint8Array) {
    return this.indexdb.setCommit(commit, data)
  }
  // bookmark references are saved in memory
  setBookmark(bookmark: Bookmark) {
    return this.indexdb.setBookmark(bookmark)
  }
  removeBookmark(id: string) {
    return this.indexdb.removeBookmark(id)
  }

  getAllCommits() {
    return this.indexdb.getAllCommits()
  }
  getAllBookmarks() {
    return this.indexdb.getAllBookmarks()
  }
}

function unwrapResponse<T>({ data, error }: { data?: T; error?: unknown }): T {
  if (data === undefined || error !== undefined) {
    const msg =
      (error as { error?: { message?: string } } | undefined)?.error?.message ??
      'Request failed'
    throw new Error(msg)
  }
  return data
}
