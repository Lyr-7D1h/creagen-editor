import { encode } from '@msgpack/msgpack'
import type {
  BlobHash,
  Bookmark,
  Commit,
  CommitHash,
  DeltizedBlob,
  Storage,
} from 'versie'
import { IndexDBStorage } from 'versie'
import type { CommitMetadata } from '../creagen-editor/CommitMetadata'
import { logger } from '../logs/logger'
import type { RemoteClient } from '../remote/remoteClient'
import {
  unwrapDataResponse,
  unwrapResponse,
  type StoredCommit,
} from '../remote/remoteClient'
import { promptLogin } from '../user/promptLogin'
import type { Auth } from './RemoteClientStorage'

/** Implementation of the versie storage class using remote data */
export class RemoteVersieStorage implements Storage<CommitMetadata> {
  static async create(auth: Auth | null, remoteClient: RemoteClient) {
    const indexdbStorageResult = await IndexDBStorage.create<CommitMetadata>({
      lookupDeltaBlob: async (indexdb, hash) => {
        const blob = await indexdb.get('blobs', hash)
        if (blob != null) return blob

        // TODO(perf): fetch all missing delta blobs needed to reconstruct a blob in one go, save all locally
        const buffer = unwrapDataResponse(
          await remoteClient.GET('/api/commits/data/{blobHash}', {
            params: { path: { blobHash: hash.toHex() } },
            parseAs: 'arrayBuffer',
          }),
        )
        if (!(buffer instanceof ArrayBuffer)) return null
        const data = new Uint8Array(buffer) as DeltizedBlob

        // store locally in background to promote faster lookup speeds
        indexdb
          .add('blobs', hash, data)
          .catch((e) => logger.error('Failed to cache blob locally', e))

        return data
      },
    })
    if (!indexdbStorageResult.ok) throw indexdbStorageResult.error
    if (!indexdbStorageResult.value.persisted)
      logger.warn('Local storage might not be persisted')
    const indexdb = indexdbStorageResult.value.indexdb

    return new RemoteVersieStorage(auth, remoteClient, indexdb)
  }

  constructor(
    private readonly auth: Auth | null,
    private readonly remoteClient: RemoteClient,
    readonly indexdb: IndexDBStorage<CommitMetadata>,
  ) {}

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
    this.indexdb
      .add('commits', id, commit)
      .catch((e) => logger.error('Failed to set commit locally', e))
    return commit
  }

  async getCommitData(hash: BlobHash) {
    // uses deltizer.reconstruct internally, meaning it will also lookup from remote using our custom `lookupDeltaBlob`
    return this.indexdb.getCommitData(hash)
  }

  async setCommit(commit: Commit<CommitMetadata>, data: string) {
    if (!this.auth) {
      return promptLogin('Log in to save commits across sessions.')
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
    if (metadata.author !== this.auth.user.username) {
      throw new Error('Trying to commit for a different user')
    }
    const storedCommit: StoredCommit = {
      blob: commit.blob.toHex(),
      createdOn: commit.createdOn.getTime(),
      parent: commit.parent?.toHex(),
      metadata: {
        editorVersion: metadata.editorVersion,
        libraries: metadata.libraries,
        author: metadata.author,
      },
    }
    const body = encode(
      {
        commit: storedCommit,
        data: compressedData,
      },
      { ignoreUndefined: true },
    )
    const res = unwrapResponse(
      await this.remoteClient.POST('/api/user/commits', {
        body: body as unknown as string,
        bodySerializer: (b) => b,
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    )
    if (typeof res.size === 'number') this.auth.user.quotaBytesUsed += res.size
    if (res.commitHash !== commit.hash.toHex())
      throw Error(
        'Commit hash mismatch: server is using different hashing mechanism than client',
      )
    await this.indexdb.setCommit(commit, data)
  }
  // bookmark references are saved in memory
  async setBookmark(bookmark: Bookmark) {
    if (!this.auth) {
      return promptLogin('Log in to create bookmarks.')
    }
    unwrapResponse(
      await this.remoteClient.POST('/api/user/bookmarks', {
        body: { name: bookmark.name, commit: bookmark.commit.toHex() },
      }),
    )
    return this.indexdb.setBookmark(bookmark)
  }

  async removeBookmark(id: string) {
    if (!this.auth) {
      return promptLogin('Log in to remove bookmarks.')
    }
    unwrapResponse(
      await this.remoteClient.DELETE('/api/user/bookmarks/{bookmarkName}', {
        params: { path: { bookmarkName: id } },
      }),
    )
    return this.indexdb.removeBookmark(id)
  }

  async getAllCommits() {
    // using local, `syncCommits` fetches all missing commits on startup
    return this.indexdb.getAllCommits()
  }

  async getAllBookmarks() {
    if (!this.auth) {
      return []
    }
    const res = unwrapDataResponse(
      await this.remoteClient.GET('/api/user/bookmarks'),
    )
    if (res == null) return []
    return res.bookmarks
  }
}
