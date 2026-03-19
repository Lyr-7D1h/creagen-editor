import { AsyncResult, Result } from 'typescript-result'
import { z, ZodError } from 'zod'
import { Bookmark, bookmarkSchema } from './Bookmarks'
import { BlobStorage } from './BlobStorage'
import { Commit, CommitHash, BlobHash, MetaData, commitSchema } from './Commit'
import { JsonValue, Storage, VCSImport } from './Storage'

export class StorageError extends Error {
  readonly type = 'storage-error'

  constructor(error: Error) {
    super(error.message)
    this.name = 'StorageError'

    // Preserve stack trace from wrapped error when available.
    this.stack = error.stack ?? this.stack

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ParseError extends Error {
  readonly type = 'parse-error'

  constructor(error: ZodError) {
    super(`Failed to parse: ${error.message}`)
    this.name = this.constructor.name
  }
}

const vcsImportSchema = z.object({
  version: z.number(),
  bookmarks: z.unknown().array(),
  commits: z.unknown().array(),
  blobs: z.unknown().array(),
  delta: z.unknown().array(),
})

/** VCS Storage wrapper that handles efficient data storage and parsing */
export class VCSStorage<M extends MetaData> {
  private readonly blobStorage: BlobStorage<M>

  constructor(
    private readonly storage: Storage<M>,
    private readonly parseMetadata: (raw: unknown) => M,
  ) {
    this.blobStorage = new BlobStorage(storage)
  }

  private toStorageError(error: unknown): StorageError {
    if (error instanceof StorageError) return error
    if (error instanceof Error) return new StorageError(error)
    return new StorageError(new Error(String(error)))
  }

  getBookmark(
    name: string,
  ): AsyncResult<Bookmark | null, ParseError | StorageError> {
    return Result.fromAsync(async () => {
      let raw: Awaited<ReturnType<Storage<M>['getBookmark']>>
      try {
        raw = await this.storage.getBookmark(name)
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }

      if (raw === null) return Result.ok(null)
      const result = bookmarkSchema.safeParse(raw)
      return result.success
        ? Result.ok(result.data)
        : Result.error(new ParseError(result.error))
    })
  }

  setBookmark(bookmark: Bookmark): AsyncResult<void, StorageError> {
    return Result.fromAsync(async () => {
      try {
        await this.storage.setBookmark(bookmark)
        return Result.ok()
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }
    })
  }

  removeBookmark(name: string): AsyncResult<void, StorageError> {
    return Result.fromAsync(async () => {
      try {
        await this.storage.removeBookmark(name)
        return Result.ok()
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }
    })
  }

  // --- Commits ---

  getCommit(
    hash: CommitHash,
  ): AsyncResult<Commit<M> | null, ParseError | StorageError> {
    return Result.fromAsync(async () => {
      let raw: JsonValue | null
      try {
        raw = await this.storage.getCommit(hash)
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }

      if (raw === null) return Result.ok(null)

      const parsed = commitSchema.safeParse(raw)
      if (!parsed.success) return Result.error(new ParseError(parsed.error))

      const metadata = this.parseMetadata(parsed.data.metadata)

      return Result.ok(
        new Commit(
          hash,
          parsed.data.blob,
          parsed.data.createdOn,
          metadata,
          parsed.data.parent,
        ),
      )
    })
  }

  setCommit(commit: Commit<M>): AsyncResult<void, StorageError> {
    return Result.fromAsync(async () => {
      try {
        await this.storage.setCommit(commit)
        return Result.ok()
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }
    })
  }

  getAllBookmarks() {
    return Result.fromAsync(async () => {
      let rawList
      try {
        rawList = await this.storage.getAllBookmarks()
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }

      const bookmarks: Bookmark[] = []
      for (const raw of rawList) {
        const parsed = bookmarkSchema.safeParse(raw)
        if (!parsed.success) return Result.error(new ParseError(parsed.error))

        bookmarks.push(parsed.data)
      }
      return Result.ok(bookmarks)
    })
  }

  getAllCommits(): AsyncResult<Commit<M>[], ParseError | StorageError> {
    return Result.fromAsync(async () => {
      let rawList: Awaited<ReturnType<Storage<M>['getAllCommits']>>
      try {
        rawList = await this.storage.getAllCommits()
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }

      const commits: Commit<M>[] = []
      for (const raw of rawList) {
        const parsed = commitSchema.safeParse(raw)
        if (!parsed.success) return Result.error(new ParseError(parsed.error))

        const metadata = this.parseMetadata(parsed.data.metadata)

        commits.push(
          await Commit.create(
            parsed.data.blob,
            parsed.data.createdOn,
            metadata,
            parsed.data.parent,
          ),
        )
      }
      return Result.ok(commits)
    })
  }

  getBlob(hash: BlobHash): AsyncResult<string | null, StorageError> {
    return Result.fromAsync(async () => {
      try {
        return Result.ok(await this.blobStorage.get(hash))
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }
    })
  }

  setBlob(
    code: string,
    hash: BlobHash,
    base?: BlobHash,
  ): AsyncResult<void, StorageError> {
    return Result.fromAsync(async () => {
      try {
        await this.blobStorage.set(hash, code, base)
        return Result.ok()
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }
    })
  }

  import(data: unknown): AsyncResult<void, ParseError | StorageError> {
    return Result.fromAsync(async () => {
      const parsed = vcsImportSchema.safeParse(data)
      if (!parsed.success) return Result.error(new ParseError(parsed.error))
      try {
        await this.storage.import(parsed.data as VCSImport)
        return Result.ok()
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }
    })
  }

  export(): AsyncResult<VCSImport, StorageError> {
    return Result.fromAsync(async () => {
      try {
        return Result.ok(await this.storage.export())
      } catch (error) {
        return Result.error(this.toStorageError(error))
      }
    })
  }
}
