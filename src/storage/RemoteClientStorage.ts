import { encode, decode } from '@msgpack/msgpack'
import { z } from 'zod'
import { localStorage } from './LocalStorage'
import { CustomKeybinding } from '../creagen-editor/keybindings'
import { IndexDBStorage, Commit, Sha256Hash } from 'versie'
import type {
  Storage,
  CommitHash,
  BlobHash,
  Bookmark,
  CommitJson,
} from 'versie'
import {
  CommitMetadata,
  CommitMetadataJson,
} from '../creagen-editor/CommitMetadata'
import {
  remoteClient,
  RemoteClient,
  StoredCommit,
  User,
} from '../remote/remoteClient'
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
  static async create(indexdb: IndexDBStorage<CommitMetadata>) {
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
      const blobHash = Sha256Hash.fromHex(remoteCommit.blob) as BlobHash
      const hash = Sha256Hash.fromHex(remoteCommit.hash) as CommitHash
      const parent =
        remoteCommit.parent != null
          ? (Sha256Hash.fromHex(remoteCommit.parent) as CommitHash)
          : undefined
      const metadata = CommitMetadata.parse({
        editorVersion: remoteCommit.editorVersion,
        libraries: remoteCommit.libraries,
        author: this.user.username,
      })
      const commit = new Commit(
        hash,
        blobHash,
        new Date(remoteCommit.createdOn),
        metadata,
        parent,
      )
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

  private toCommit({
    blob,
    createdOn,
    parent,
    editorVersion,
    libraries,
    author,
  }: StoredCommit): CommitJson<CommitMetadataJson> {
    return {
      blob,
      createdOn,
      parent,
      metadata: {
        editorVersion,
        libraries,
        author,
      },
    }
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
    return this.toCommit(res.commit)
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
    const checkoutSchema = z.object({
      commit: z.object({
        blob: z.string(),
        createdOn: z.number().int(),
        parent: z.string().optional(),
        editorVersion: z.string(),
        libraries: z.array(z.object({ name: z.string(), version: z.string() })),
        author: z.string(),
      }),
      data: z.instanceof(Uint8Array),
    })
    const decoded = checkoutSchema.parse(decode(res))
    const compressedData = Uint8Array.from(decoded.data)
    const data = await new Response(
      new Blob([compressedData])
        .stream()
        .pipeThrough(new DecompressionStream('deflate')),
    ).text()

    // store locally non blocking
    this.indexdb
      .setCommitDataOnly(
        (await Sha256Hash.fromString(decoded.commit.blob)) as BlobHash,
        data,
      )
      .catch((e: unknown) =>
        logger.error('Failed to set commit data locally', e),
      )

    const commit = this.toCommit(decoded.commit)

    return { commit, data }
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
