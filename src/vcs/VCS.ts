import { Commit, CommitHash, BlobHash, MetaData } from './Commit'
import {
  isBookmark,
  Bookmark,
  Bookmarks,
  BookmarkNotFoundError,
  BookmarkAlreadyExistsError,
} from './Bookmarks'
export { BookmarkAlreadyExistsError } from './Bookmarks'
import { Storage } from './Storage'
import { AsyncResult, Result } from 'typescript-result'
import { ParseError, StorageError, VCSStorage } from './VCSStorage'
import { Sha256Hash } from './Sha256Hash'
import { generateHumanReadableName } from '../creagen-editor/generateHumanReadableName'
import { VCSError } from './VCSError'

export type Checkout<M extends MetaData> = {
  commit: Commit<M>
  data: string
}

export type HistoryItem<M extends MetaData> = {
  commit: Commit<M>
  bookmarks: Bookmark[]
}

/** Active Reference, a reference that might not be comitted yet */
export type ActiveBookmark = {
  name: string
  createdOn: Date
  /** If set it means that the ref is stored otherwise it is an uncommited bookmark */
  commit: CommitHash | null
}

export class CommitNotFoundError extends VCSError {
  readonly type = 'commit-not-found'

  constructor(hash: CommitHash) {
    super(`Commit '${hash.toHex()}' not found`)
  }
}

export class BlobNotFoundError extends VCSError {
  readonly type = 'blob-not-found'

  constructor(hash: BlobHash) {
    super(`Blob '${hash.toHex()}' not found`)
  }
}

function generateUncommittedBookmark() {
  return {
    name: generateHumanReadableName(),
    createdOn: new Date(),
    commit: null,
  }
}

// TODO: use https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system for storage
/** Version Control Software for creagen-editor */
export class VCS<M extends MetaData> {
  static async create<M extends MetaData, S extends Storage<M>>(
    storage: S,
    parseMetadata: (raw: unknown) => M,
  ) {
    const vcsStorage = new VCSStorage(storage, parseMetadata)
    const bookmarks = await Bookmarks.create(vcsStorage)
    if (!bookmarks.ok) return bookmarks

    return Result.ok(new VCS<M>(vcsStorage, bookmarks.value))
  }

  private _head: Commit<M> | null = null
  private _activeBookmark: ActiveBookmark = generateUncommittedBookmark()
  private constructor(
    private readonly storage: VCSStorage<M>,
    private readonly _bookmarks: Bookmarks<M>,
  ) {}

  get head() {
    return this._head
  }

  get activeBookmark() {
    return this._activeBookmark
  }

  /**
   * Add a bookmark
   *
   * returns null if already exists
   * */
  addBookmark(name: string, commit: CommitHash) {
    return this.bookmarks.add(new Bookmark(name, commit, new Date()))
  }

  bookmarkLookup(commit: CommitHash) {
    return this.bookmarks.bookmarkLookup(commit)
  }

  removeBookmark(name: string) {
    return this.bookmarks.remove(name)
  }

  renameBookmark(oldName: string, newName: string) {
    return this.bookmarks.rename(oldName, newName)
  }

  get bookmarks() {
    return this._bookmarks
  }

  /**
   * Get history
   * @param n - How far to go back
   */
  history(
    n: number,
    start?: Commit<M>,
  ): AsyncResult<HistoryItem<M>[], ParseError | StorageError> {
    return Result.fromAsync(async () => {
      /** PERF: Make more efficient by querying commits by same author around that time and caching those commits */
      let next: Commit<M> | null = start ?? this._head
      const history: HistoryItem<M>[] = []
      for (let i = 0; i < n; i++) {
        if (next === null) break
        const bookmarks = this.bookmarks.bookmarkLookup(next.hash) ?? []
        history.push({ commit: next, bookmarks })

        if (typeof next.parent === 'undefined') break
        const parentResult = await this.storage.getCommit(next.parent)
        if (!parentResult.ok) {
          return Result.error(parentResult.error)
        }
        if (parentResult.value === null) {
          break
        }
        next = parentResult.value
      }
      return Result.ok(history)
    })
  }

  /**
   * Get all commits from storage
   */
  getAllCommits() {
    return this.storage.getAllCommits()
  }

  /**
   * Update current active bookmark to this commit, or commit the bookmark
   *
   * @returns null when failed to update bookmarks
   */
  private updateActiveBookmark(
    commit: CommitHash,
  ): AsyncResult<
    void,
    BookmarkNotFoundError | StorageError | BookmarkAlreadyExistsError
  > {
    return Result.fromAsync(async () => {
      if (this.activeBookmark.commit === null) {
        // commit uncommitted bookmark
        const ref = new Bookmark(
          this._activeBookmark.name,
          commit,
          this._activeBookmark.createdOn,
        )
        const result = await this.bookmarks.add(ref)
        if (!result.ok) return result
        this._activeBookmark = result.value
      } else {
        // update currently active to this commit
        const result = await this.bookmarks.setCommit(
          this.activeBookmark.name,
          commit,
        )
        if (!result.ok) return result
        this._activeBookmark = result.value
      }
      return Result.ok()
    })
  }

  /**
   * Create a new commit and update the head to this commit
   *
   * @returns null in case nothing changed
   * */
  commit(
    /** The value to be stored and comitted */
    value: string,
    /** Metadata related to this commit */
    metadata: M,
    /** Update active bookmark to this commit */
    updateActiveBookmark: boolean = true,
  ): AsyncResult<
    Commit<M> | null,
    BookmarkNotFoundError | StorageError | BookmarkAlreadyExistsError
  > {
    return Result.fromAsync(async () => {
      const blob = (await Sha256Hash.create(value)) as BlobHash
      // don't commit if nothing changed
      if (
        this._head &&
        blob.compare(this._head.blob) &&
        (this._head.metadata && metadata
          ? this._head.metadata.compare(metadata)
          : true)
      ) {
        return Result.ok(null)
      }

      const commit = await Commit.create(
        blob,
        new Date(),
        metadata,
        this._head ? this._head.hash : undefined,
      )

      const setCommitResult = await this.storage.setCommit(commit)
      if (setCommitResult.ok === false) return setCommitResult

      const setBlobResult = await this.storage.setBlob(
        value,
        commit.blob,
        this._head?.blob,
      )
      if (setBlobResult.ok === false) return setBlobResult

      if (updateActiveBookmark) {
        const updateResult = await this.updateActiveBookmark(commit.hash)
        if (updateResult.ok === false) {
          return updateResult
        }
      }

      this._head = commit
      return Result.ok(commit)
    })
  }

  /**
   * Create a new bookmark on a optional commit and checkout
   *
   * @returns Checkout of `hash` when `hash` is given
   * */
  new(
    hash?: CommitHash,
  ): AsyncResult<
    Checkout<M> | null,
    ParseError | StorageError | BlobNotFoundError | CommitNotFoundError
  > {
    return Result.fromAsync(async () => {
      if (hash) {
        const res = await this.storage.getCommit(hash)
        if (!res.ok) return res
        if (res.value === null)
          return Result.error(new CommitNotFoundError(hash))
        this._head = res.value
      } else {
        this._head = null
      }

      this._activeBookmark = generateUncommittedBookmark()

      let data = null
      if (this._head) {
        const blobResult = await this.storage.getBlob(this._head.blob)
        if (blobResult.ok === false) return blobResult
        data = blobResult.value
        if (data === null) {
          return Result.error(new BlobNotFoundError(this._head.blob))
        }
      }
      return Result.ok(
        this._head && data != null
          ? {
              data,
              commit: this._head,
            }
          : null,
      )
    })
  }

  /**
   * Checkout a `Bookmark` or `Commit`
   *
   * Checking out a `Commit` will set the active `Bookmark` to that commit
   * */
  checkout(
    id: CommitHash,
  ): AsyncResult<
    Checkout<M>,
    | ParseError
    | StorageError
    | CommitNotFoundError
    | BlobNotFoundError
    | BookmarkNotFoundError
    | BookmarkAlreadyExistsError
  >
  checkout(
    bookmark: Bookmark,
  ): AsyncResult<
    Checkout<M>,
    | ParseError
    | StorageError
    | CommitNotFoundError
    | BlobNotFoundError
    | BookmarkNotFoundError
    | BookmarkAlreadyExistsError
  >
  checkout(
    id: CommitHash | Bookmark,
  ): AsyncResult<
    Checkout<M>,
    | ParseError
    | StorageError
    | CommitNotFoundError
    | BlobNotFoundError
    | BookmarkNotFoundError
    | BookmarkAlreadyExistsError
  >
  checkout(
    id: CommitHash | Bookmark,
  ): AsyncResult<
    Checkout<M>,
    | ParseError
    | StorageError
    | CommitNotFoundError
    | BlobNotFoundError
    | BookmarkNotFoundError
    | BookmarkAlreadyExistsError
  > {
    return Result.fromAsync(async () => {
      const hash = isBookmark(id) ? id.commit : id
      let bookmark
      if (isBookmark(id)) {
        bookmark = id

        id = id.commit
      }

      let commit =
        id === this._head?.hash // use head if it matches to prevent storage call
          ? this._head
          : null
      if (commit === null) {
        const commitResult = await this.storage.getCommit(id)
        if (!commitResult.ok) return commitResult
        commit = commitResult.value
      }
      if (commit === null) return Result.error(new CommitNotFoundError(hash))
      const blobResult = await this.storage.getBlob(commit.blob)
      if (!blobResult.ok) return blobResult

      const data = blobResult.value
      if (data === null) return Result.error(new BlobNotFoundError(commit.blob))

      if (bookmark) {
        this._activeBookmark = bookmark
      } else if (this._activeBookmark.commit !== null) {
        // set current active bookmark to this commit unless the bookmark is uncommitted
        const updateResult = await this.updateActiveBookmark(commit.hash)
        if (!updateResult.ok) {
          return updateResult
        }
      }

      this._head = commit

      return Result.ok({ commit, data })
    })
  }

  /**
   * Import data into vcs
   *
   * NOTE: Skips inner validation due to performance overhead
   */
  import(data: unknown) {
    return this.storage.import(data)
  }

  /**
   * Export data into vcs
   *
   * NOTE: Skips inner validation due to performance overhead
   */
  export() {
    return this.storage.export()
  }
}
