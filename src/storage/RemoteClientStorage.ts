import { encode, decode } from '@msgpack/msgpack'
import { localStorage } from './LocalStorage'
import type { CustomKeybinding } from '../creagen-editor/keybindings'
import { Commit, Sha256Hash } from 'versie'
import type { Storage, CommitHash, BlobHash, Bookmark } from 'versie'
import { IndexDBStorage } from 'versie'
import { CommitMetadata } from '../creagen-editor/CommitMetadata'
import type { RemoteClient, StoredCommit, User } from '../remote/remoteClient'
import { remoteClient } from '../remote/remoteClient'
import { parseJwtPayload } from '../user/jwt'
import { logger } from '../logs/logger'
import { editorEvents } from '../events/events'

function authMiddleware(token: string) {
  return {
    onRequest: ({ request }: { request: Request }) => {
      request.headers.set('Authorization', `Bearer ${token}`)
    },
  }
}

async function resolveAuth(
  remoteClient: RemoteClient,
): Promise<{ token?: string | undefined; user?: User | undefined }> {
  const token = localStorage.get('creagen-auth-token') ?? undefined
  let user: User | undefined
  if (token != null) {
    const payload = parseJwtPayload(token)
    if (payload === null) {
      localStorage.remove('creagen-auth-token')
      return {}
    }
    if (payload.exp < Date.now() / 1000) {
      localStorage.remove('creagen-auth-token')
      return {}
    }
    const auth = authMiddleware(token)
    remoteClient.use(auth)
    const res = await remoteClient.GET('/api/user')
    const status = res.response.status
    if (status === 401 || status === 404) {
      localStorage.remove('creagen-auth-token')
      remoteClient.eject(auth)
      logger.error('User is unauthorized')
      return {}
    }
    if (res.error) {
      logger.error(`Failed to fetch user: ${res.error.error.message}`)
      return {}
    }
    user = res.data.user
  }
  return { token, user }
}

/** Entry point for fetching all data */
export class RemoteClientStorage implements Storage<CommitMetadata> {
  static async create() {
    const indexdbStorageResult = await IndexDBStorage.create<CommitMetadata>()
    if (!indexdbStorageResult.ok) throw indexdbStorageResult.error
    if (!indexdbStorageResult.value.persisted)
      logger.warn('Failed to persist storage')
    const indexdb = indexdbStorageResult.value.indexdb

    if (remoteClient === null) {
      throw Error('No remote client configured')
    }

    const auth = await resolveAuth(remoteClient)

    return new RemoteClientStorage(remoteClient, indexdb, auth.token, auth.user)
  }

  constructor(
    private readonly remoteClient: RemoteClient,
    readonly indexdb: IndexDBStorage<CommitMetadata>,
    private readonly token?: string,
    readonly user?: User,
  ) {
    if (user) this.syncCommits().catch(logger.error)
  }

  async syncCommits() {
    if (!this.user) {
      this.promptLogin('Log in to sync your commits from the cloud.')
    }
    const lastSeq = localStorage.get('commit-seq') ?? 0
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/user/commits', {
        params: { query: { seq: lastSeq } },
      }),
    )
    if (res === null) return
    for (const remoteCommit of res.commits) {
      const commit = await this.parseCommit(remoteCommit.commit)
      await this.indexdb.setCommitOnly(commit)
    }
    localStorage.set('commit-seq', res.nextSeq)
  }

  session() {
    if (this.token == null) return null
    return parseJwtPayload(this.token)
  }

  promptLogin(message?: string): never {
    editorEvents.emit('login-prompt', message == null ? {} : { message })
    throw new Error(message ?? 'Login required')
  }

  async login(username: string, password: string, turnstileToken: string) {
    try {
      const { token } = unwrapResponse(
        await this.remoteClient.POST('/api/login', {
          body: { username, password, turnstileToken },
        }),
      )
      localStorage.set('creagen-auth-token', token)
      window.location.reload()
      return true
    } catch (e) {
      return e instanceof Error ? e.message : 'Login failed'
    }
  }

  logout() {
    localStorage.remove('creagen-auth-token')
    window.location.reload()
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

  //
  // CREAGEN EDITOR TYPES using localstorage in case not logged in
  //

  async setSettings(value: unknown) {
    if (typeof this.token === 'undefined' || typeof this.user === 'undefined') {
      return localStorage.set('settings', value)
    }
    unwrapResponse(
      await this.remoteClient.POST('/api/user/settings', {
        body: value as Record<string, unknown>,
      }),
    )
  }
  async getSettings() {
    if (typeof this.token === 'undefined' || typeof this.user === 'undefined') {
      return localStorage.get('settings')
    }
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/user/settings'),
    )
    if (res === null) return null
    return res.settings
  }
  async setCustomKeybindings(keybindings: CustomKeybinding[]) {
    if (typeof this.token === 'undefined' || typeof this.user === 'undefined') {
      return localStorage.set('custom-keybindings', keybindings)
    }
    unwrapResponse(
      await this.remoteClient.POST('/api/user/keybindings', {
        body: keybindings,
      }),
    )
  }
  async getCustomKeybindings() {
    if (typeof this.token === 'undefined' || typeof this.user === 'undefined') {
      return localStorage.get('custom-keybindings')
    }
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/user/keybindings'),
    )
    if (res === null) return null
    return res.keybindings as CustomKeybinding[]
  }

  async getCommit(id: CommitHash) {
    const local = await this.indexdb.getCommit(id)
    if (local !== null) return local

    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/commits/{commitHash}', {
        params: { path: { commitHash: id.toHex() } },
      }),
    )
    if (res == null) return null
    const commit = res.commit
    // store locally non blocking
    this.parseCommit(commit)
      .then((c) => {
        this.indexdb
          .setCommitOnly(c)
          .catch((e) => logger.error('Failed to set commit locally', e))
      })
      .catch((e) => logger.error('Failed to parse commit metadata', e))
    return commit
  }

  async getCommitData(hash: BlobHash) {
    const local = await this.indexdb.getCommitData(hash)
    if (local !== null) return local
    const res = await this.remoteClient.GET('/api/commits/data/{blobHash}', {
      params: { path: { blobHash: hash.toHex() } },
      parseAs: 'arrayBuffer',
    })
    if (!(res.data instanceof ArrayBuffer)) return null
    const compressedData = new Uint8Array(res.data)
    const data = await new Response(
      new Blob([compressedData])
        .stream()
        .pipeThrough(new DecompressionStream('deflate')),
    ).text()
    // store locally non blocking
    this.indexdb
      .setCommitDataOnly(hash, data)
      .catch((e: unknown) =>
        logger.error('Failed to set commit data locally', e),
      )
    return data
  }

  private parseCommit(commit: StoredCommit) {
    const metadata = CommitMetadata.parse(commit.metadata)
    const blob = Sha256Hash.fromHex(commit.blob) as BlobHash
    const parent = commit.parent
      ? (Sha256Hash.fromHex(commit.parent) as CommitHash)
      : undefined
    return Commit.create(blob, new Date(commit.createdOn), metadata, parent)
  }

  async getCheckout(commitHash: CommitHash) {
    const local = await this.indexdb.getCheckout(commitHash)
    if (local !== null) return local
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/commits/{commitHash}/checkout', {
        params: { path: { commitHash: commitHash.toHex() } },
        parseAs: 'arrayBuffer',
      }),
    )
    if (res === null) return null
    const decoded = decode(res) as { commit: StoredCommit; data: Uint8Array }
    const compressedData = Uint8Array.from(decoded.data)
    const data = await new Response(
      new Blob([compressedData])
        .stream()
        .pipeThrough(new DecompressionStream('deflate')),
    ).text()

    this.parseCommit(decoded.commit)
      .then((c) => {
        this.indexdb
          .setCommit(c, data)
          .catch((e) => logger.error('Failed to set commit data locally', e))
      })
      .catch((e) => logger.error('Failed to parse commit metadata', e))

    return { commit: decoded.commit, data }
  }

  async setCommit(commit: Commit<CommitMetadata>, data: string) {
    if (typeof this.token === 'undefined' || typeof this.user === 'undefined') {
      this.promptLogin('Log in to save commits across sessions.')
    }

    const compressedData = new Uint8Array(
      await new Response(
        new Blob([new TextEncoder().encode(data)])
          .stream()
          .pipeThrough(new CompressionStream('deflate')),
      ).arrayBuffer(),
    )

    const metadata = commit.metadata.toJson()
    if (!('author' in metadata))
      throw new Error('Trying to commit without author defined')
    if (metadata.author !== this.user.username) {
      throw new Error('Trying to commit for a different user')
    }
    const body = encode({
      hash: commit.hash.toHex(),
      blob: commit.blob.toHex(),
      createdOn: commit.createdOn.getTime(),
      parent: commit.parent?.toHex(),
      editorVersion: metadata.editorVersion,
      libraries: metadata.libraries,
      author: metadata.author,
      data: compressedData,
    })
    const res = unwrapResponse(
      await this.remoteClient.POST('/api/user/commits', {
        body: body as unknown as string,
        bodySerializer: (b) => b,
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    )
    if (typeof res.size === 'number') this.user.quotaBytesUsed += res.size
    await this.indexdb.setCommit(commit, data)
  }
  // bookmark references are saved in memory
  async setBookmark(bookmark: Bookmark) {
    if (typeof this.token === 'undefined' || typeof this.user === 'undefined') {
      this.promptLogin('Log in to create bookmarks.')
    }
    unwrapResponse(
      await this.remoteClient.POST('/api/user/bookmarks', {
        body: { name: bookmark.name, commit: bookmark.commit.toHex() },
      }),
    )
    return this.indexdb.setBookmark(bookmark)
  }

  async removeBookmark(id: string) {
    if (typeof this.token === 'undefined' || typeof this.user === 'undefined') {
      this.promptLogin('Log in to remove bookmarks.')
    }
    unwrapResponse(
      await this.remoteClient.DELETE('/api/user/bookmarks/{bookmarkName}', {
        params: { path: { bookmarkName: id } },
      }),
    )
    return this.indexdb.removeBookmark(id)
  }

  async getAllCommits() {
    return this.indexdb.getAllCommits()
  }

  async getAllBookmarks() {
    if (typeof this.token === 'undefined' || typeof this.user === 'undefined') {
      return []
    }
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/user/bookmarks'),
    )
    if (res == null) return []
    return res.bookmarks
  }
}

/** Parse response, returning null in case of 404 */
function unwrapDataResponse<T>(r: {
  data?: T
  error?: unknown
  response: Response
}): T | null {
  if (r.response.status === 404) return null
  return unwrapResponse(r)
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
