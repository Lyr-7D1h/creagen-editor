import { Commit, CommitHash, BlobHash, MetaData } from './Commit'
import { isBookmark, Bookmark, Bookmarks } from './Bookmarks'
import { editorEvents } from '../events/events'
import { generateHumanReadableName } from './generateHumanReadableName'
import { Storage } from './Storage'
import { AsyncResult, Result } from 'typescript-result'
import { ParseError, StorageError, VCSStorage } from './VCSStorage'
import { Sha256Hash } from './Sha256Hash'

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

export class VCSError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class BookmarkAlreadyExistsError extends VCSError {
  readonly type = 'bookmark-already-exists'

  constructor(name: string) {
    super(`Bookmark '${name}' already exists`)
  }
}

export class BookmarkNotFoundError extends VCSError {
  readonly type = 'bookmark-not-found'

  constructor(name: string) {
    super(`Bookmark '${name}' not found`)
  }
}

export class BookmarkRenameFailedError extends VCSError {
  readonly type = 'bookmark-rename-failed'

  constructor(oldName: string, newName: string) {
    super(`Failed to rename bookmark from '${oldName}' to '${newName}'`)
  }
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

/** Version Control Software for creagen-editor */
export class VCS<M extends MetaData> {
  static async create<M extends MetaData, S extends Storage<M>>(
    storage: S,
    parseMetadata: (raw: unknown) => M,
  ) {
    const vcsStorage = new VCSStorage(storage, parseMetadata)
    const bmsResult = await vcsStorage.getBookmarks()
    if (!bmsResult.ok) return bmsResult

    return Result.ok(
      new VCS<M>(vcsStorage, bmsResult.value, generateUncommittedBookmark()),
    )
  }

  private _head: Commit<M> | null = null
  private constructor(
    private readonly storage: VCSStorage<M>,
    private readonly _bookmarks: Bookmarks,
    private _activeBookmark: ActiveBookmark,
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
  addBookmark(
    name: string,
    commit: CommitHash,
  ): AsyncResult<Bookmark, BookmarkAlreadyExistsError | StorageError> {
    return Result.fromAsync(async () => {
      if (this.bookmarks.getBookmark(name) !== null) {
        return Result.error(new BookmarkAlreadyExistsError(name))
      }
      const bookmark = new Bookmark(name, commit, new Date())
      this.bookmarks.add(bookmark)
      const setResult = await this.storage.setBookmarks(this.bookmarks)
      if (!setResult.ok) return setResult
      editorEvents.emit('vcs:bookmark-update', undefined)
      return Result.ok(bookmark)
    })
  }

  bookmarkLookup(commit: CommitHash) {
    return this.bookmarks.bookmarkLookup(commit)
  }

  removeBookmark(name: string): AsyncResult<void, StorageError> {
    return Result.fromAsync(async () => {
      this.bookmarks.remove(name)
      if (this._activeBookmark.name === name) {
        this._activeBookmark = generateUncommittedBookmark()
      }

      const setResult = await this.storage.setBookmarks(this.bookmarks)
      if (!setResult.ok) return setResult

      editorEvents.emit('vcs:bookmark-update', undefined)
      return Result.ok()
    })
  }

  renameBookmark(
    oldName: string,
    newName: string,
  ): AsyncResult<
    true,
    | BookmarkNotFoundError
    | BookmarkAlreadyExistsError
    | BookmarkRenameFailedError
    | StorageError
  > {
    return Result.fromAsync(async () => {
      const bookmark = this.bookmarks.getBookmark(oldName)
      if (
        bookmark === null &&
        oldName === this.activeBookmark.name &&
        this.activeBookmark.commit === null
      ) {
        this.activeBookmark.name = newName
        return Result.ok(true as const)
      }
      if (bookmark === null)
        return Result.error(new BookmarkNotFoundError(oldName))

      if (this.bookmarks.getBookmark(newName) !== null) {
        return Result.error(new BookmarkAlreadyExistsError(newName))
      }

      // if not yet committed change active bookmark name
      if (oldName === this._activeBookmark.name) {
        this.activeBookmark.name = newName
        return Result.ok(true as const)
      }

      const newBookmark = this.bookmarks.rename(oldName, newName)
      if (newBookmark === null) {
        return Result.error(new BookmarkRenameFailedError(oldName, newName))
      }
      if (this._activeBookmark.name === oldName) {
        this._activeBookmark = newBookmark as ActiveBookmark
      }
      const setResult = await this.storage.setBookmarks(this.bookmarks)
      if (!setResult.ok) return setResult
      editorEvents.emit('vcs:bookmark-update', undefined)
      return Result.ok(true as const)
    })
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
  ): AsyncResult<void, BookmarkNotFoundError | StorageError> {
    return Result.fromAsync(async () => {
      if (this.activeBookmark.commit === null) {
        // commit uncommitted bookmark
        const ref = new Bookmark(
          this._activeBookmark.name,
          commit,
          this._activeBookmark.createdOn,
        )
        this.bookmarks.add(ref)
        this._activeBookmark = ref
      } else {
        // update currently active to this commit
        const newBookmark = this.bookmarks.update(
          this.activeBookmark.name,
          commit,
        )
        if (newBookmark === null)
          return Result.error(
            new BookmarkNotFoundError(this.activeBookmark.name),
          )
        this._activeBookmark = newBookmark
      }

      const setResult = await this.storage.setBookmarks(this.bookmarks)
      if (setResult.ok === false) return setResult
      editorEvents.emit('vcs:bookmark-update', undefined)
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
  ): AsyncResult<Commit<M> | null, BookmarkNotFoundError | StorageError> {
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
