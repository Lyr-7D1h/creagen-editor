import { decode } from '@msgpack/msgpack'
import type {
  CommitHash,
  DeltizedBlob,
  IndexdbImport,
  IndexDBStorage,
} from 'versie'
import {
  blobHashSchema,
  Bookmark,
  bookmarkNameSchema,
  commitHashSchema,
  Sha256Hash,
  Versie,
} from 'versie'
import z from 'zod'
import {
  CommitMetadata,
  commitMetadataJsonSchema,
} from '../creagen-editor/CommitMetadata'
import type { CustomKeybinding } from '../creagen-editor/keybindings'
import { logger } from '../logs/logger'
import {
  authMiddleware,
  clearTokens,
  getAccessToken,
  unwrapDataResponse,
  unwrapResponse,
  type RemoteClient,
  type User,
} from '../remote/remoteClient'
import { promptLogin } from '../user/promptLogin'
import type { ClientStorage } from './ClientStorage'
import { localStorage } from './LocalStorage'
import { RemoteVersieStorage } from './RemoteVersieStorage'

const bookmarkCheckoutResponseSchema = z.object({
  bookmark: z.object({
    name: bookmarkNameSchema,
    commit: z.string(),
    createdOn: z.number().int(),
  }),
  blobHash: blobHashSchema,
  commitHash: commitHashSchema,
  commit: z.object({
    blob: z.string(),
    createdOn: z.number().int(),
    parent: z.string().optional(),
    metadata: commitMetadataJsonSchema,
  }),
  blob: z.custom<DeltizedBlob>((val) => val instanceof Uint8Array),
})

export interface Auth {
  token: string
  user: User
}

/** Entry point for fetching all data */
export class RemoteClientStorage implements ClientStorage {
  static async create(remoteClient: RemoteClient) {
    remoteClient.use(authMiddleware)

    // validate and fetch user information
    const accessToken = getAccessToken()
    let auth: Auth | null = null
    if (accessToken) {
      const res = await remoteClient.GET('/api/user')
      const status = res.response.status
      if (status === 401 || status === 404) {
        clearTokens()
        logger.error('User is unauthorized')
      } else if (res.error) {
        logger.error(`Failed to fetch user: ${res.error.error.message}`)
      } else if (res.data.success) {
        auth = {
          token: accessToken,
          user: res.data.user,
        }
      }
    }

    const versieStorage = await RemoteVersieStorage.create(auth, remoteClient)
    const vcsResult = await Versie.create(versieStorage, (raw) => {
      return CommitMetadata.parse(raw)
    })
    if (!vcsResult.ok) throw vcsResult.error
    const versie = vcsResult.value

    return new RemoteClientStorage(
      remoteClient,
      versie,
      versieStorage.indexdb,
      auth,
    )
  }

  readonly remote = true
  readonly user?: User
  constructor(
    private readonly remoteClient: RemoteClient,
    readonly versie: Versie<CommitMetadata>,
    readonly indexdb: IndexDBStorage<CommitMetadata>,
    readonly auth: Auth | null,
  ) {
    if (auth) {
      this.user = auth.user
      this.syncCommits().catch(logger.error)
    }
  }

  async syncCommits() {
    if (!this.auth) {
      return promptLogin('Log in to sync your commits from the cloud.')
    }
    const lastSeq = localStorage.get('commit-seq') ?? 0
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/user/commits', {
        params: { query: { seq: lastSeq } },
      }),
    )
    if (res === null) return
    for (const remoteCommit of res.commits) {
      const commitHash = Sha256Hash.fromHex(remoteCommit.hash) as CommitHash
      await this.indexdb.add('commits', commitHash, remoteCommit.commit)
    }
    localStorage.set('commit-seq', res.nextSeq)
  }

  async login(username: string, password: string, turnstileToken: string) {
    try {
      const { token, refreshToken } = unwrapResponse(
        await this.remoteClient.POST('/api/login', {
          body: { username, password, turnstileToken },
        }),
      )
      localStorage.set('creagen-access-token', token)
      localStorage.set('creagen-refresh-token', refreshToken)
      // TODO: load user without reload of page
      window.location.reload()
      return true
    } catch (e) {
      return e instanceof Error ? e.message : 'Login failed'
    }
  }

  async register(
    username: string,
    password: string,
    turnstileToken: string,
  ): Promise<string | true> {
    try {
      unwrapResponse(
        await this.remoteClient.POST('/api/register', {
          body: {
            username,
            password,
            turnstileToken,
          },
        }),
      )
      return true
    } catch (e) {
      return e instanceof Error ? e.message : 'Registeration failed'
    }
  }

  async logout() {
    const refreshToken = localStorage.get('creagen-refresh-token')
    if (refreshToken != null) {
      try {
        await this.remoteClient.POST('/api/user/logout', {
          body: { refreshToken },
        })
      } catch {
        // best effort: always proceed with the local logout
      }
    }
    clearTokens()
    window.location.reload()
  }

  estimateUsage(): Promise<StorageEstimate> {
    if (!this.auth)
      return Promise.resolve({
        quota: 1,
        usage: 0,
      })
    return Promise.resolve({
      quota: this.auth.user.quotaBytesLimit,
      usage: this.auth.user.quotaBytesUsed,
    })
  }

  async setSettings(value: Record<string, unknown>) {
    if (!this.auth) {
      return localStorage.set('settings', value)
    }
    unwrapResponse(
      await this.remoteClient.POST('/api/user/settings', {
        body: value,
      }),
    )
  }
  async getSettings() {
    if (!this.auth) {
      return localStorage.get('settings')
    }
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/user/settings'),
    )
    if (res === null) return null
    return res.settings
  }
  async setCustomKeybindings(keybindings: CustomKeybinding[]) {
    if (!this.auth) {
      return localStorage.set('custom-keybindings', keybindings)
    }
    unwrapResponse(
      await this.remoteClient.POST('/api/user/keybindings', {
        body: keybindings,
      }),
    )
  }
  async getCustomKeybindings() {
    if (!this.auth) {
      return localStorage.get('custom-keybindings')
    }
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/user/keybindings'),
    )
    if (res === null) return null
    return res.keybindings as CustomKeybinding[]
  }

  /** Load a bookmark from a user into the vcs storage and return the bookmark */
  async getUserBookmark(
    bookmarkName: string,
    /** If not username given checkout the bookmark of current user */
    username?: string,
  ): Promise<Bookmark | null> {
    username ??= this.auth?.user.username
    if (typeof username === 'undefined') throw new Error('no username given')

    const buffer = unwrapDataResponse(
      await this.remoteClient.GET(
        '/api/checkout/bookmarks/{username}/{bookmarkName}',
        {
          params: { path: { username, bookmarkName } },
          parseAs: 'arrayBuffer',
        },
      ),
    )
    if (!(buffer instanceof ArrayBuffer)) return null
    const decoded = bookmarkCheckoutResponseSchema.parse(
      decode(new Uint8Array(buffer)),
    )
    await Promise.all([
      this.indexdb.add('commits', decoded.commitHash, decoded.commit),
      this.indexdb.add('blobs', decoded.blobHash, decoded.blob),
    ])

    const res = Bookmark.create(
      decoded.bookmark.name,
      decoded.commitHash,
      new Date(decoded.bookmark.createdOn),
    )
    if (!res.ok) throw res.error
    return res.value
  }

  import(_data: IndexdbImport): Promise<void> {
    throw Error('import unsupported')
  }

  export(): Promise<IndexdbImport> {
    throw Error('import unsupported')
  }
}
