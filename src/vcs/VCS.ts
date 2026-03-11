import { Commit, CommitHash, Checkout as Checkout, BlobHash } from './Commit'
import { Library } from '../settings/SettingsConfig'
import { isBookmark, Bookmark, Bookmarks } from './Bookmarks'
import { editorEvents } from '../events/events'
import { generateHumanReadableName } from './generateHumanReadableName'
import { ClientStorage } from '../storage/ClientStorage'
import { Sha256Hash } from '../Sha256Hash'
import { SemVer } from 'semver'
import { AsyncResult, Result } from 'typescript-result'

export type HistoryItem = {
  commit: Commit
  bookmarks: Bookmark[]
}

/** Active Reference, a reference that might not be comitted yet */
export type ActiveBookmark = Omit<Bookmark, 'commit'> & {
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
export class VCS {
  static async create(storage: ClientStorage) {
    const bms = (await storage.get('bookmarks')) ?? new Bookmarks([])

    return new VCS(storage, bms, generateUncommittedBookmark())
  }

  private _head: Commit | null = null
  private constructor(
    private readonly storage: ClientStorage,
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
  ): AsyncResult<Bookmark, BookmarkAlreadyExistsError> {
    return Result.fromAsync(async () => {
      if (this.bookmarks.getBookmark(name) !== null) {
        return Result.error(new BookmarkAlreadyExistsError(name))
      }
      const bookmark: Bookmark = { name, commit, createdOn: new Date() }
      this.bookmarks.add(bookmark)
      await this.storage.set('bookmarks', this.bookmarks)
      editorEvents.emit('vcs:bookmark-update', undefined)
      return Result.ok(bookmark)
    })
  }

  bookmarkLookup(commit: CommitHash) {
    return this.bookmarks.bookmarkLookup(commit)
  }

  async removeBookmark(name: string) {
    this.bookmarks.remove(name)
    if (this._activeBookmark.name === name) {
      this._activeBookmark = generateUncommittedBookmark()
    }
    await this.storage.set('bookmarks', this.bookmarks)
    editorEvents.emit('vcs:bookmark-update', undefined)
  }

  renameBookmark(
    oldName: string,
    newName: string,
  ): AsyncResult<
    true,
    | BookmarkNotFoundError
    | BookmarkAlreadyExistsError
    | BookmarkRenameFailedError
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
      await this.storage.set('bookmarks', this.bookmarks)
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
  async history(n: number, start?: Commit): Promise<HistoryItem[]> {
    let next = start ?? this._head
    const history: HistoryItem[] = []
    for (let i = 0; i < n; i++) {
      if (next === null) break
      const bookmarks = this.bookmarks.bookmarkLookup(next.hash) ?? []
      history.push({ commit: next, bookmarks })

      if (typeof next.parent === 'undefined') break
      next = await this.storage.get('commit', next.parent)
    }
    return history
  }

  /**
   * Get all commits from storage
   */
  async getAllCommits(): Promise<Commit[]> {
    return await this.storage.getAllCommits()
  }

  /**
   * Update current active bookmark to this commit, or commit the bookmark
   *
   * @returns null when failed to update bookmarks
   */
  private updateActiveBookmark(
    commit: CommitHash,
  ): AsyncResult<void, BookmarkNotFoundError> {
    return Result.fromAsync(async () => {
      if (this.activeBookmark.commit === null) {
        // commit uncommitted bookmark
        const ref: Bookmark = { ...this._activeBookmark, commit }
        this.bookmarks.add(ref)
        this._activeBookmark = ref as ActiveBookmark
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

      await this.storage.set('bookmarks', this.bookmarks)
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
    code: string,
    libraries: Library[],
    /** Will update the current bookmark to point to this commit */
    updateBookmark: boolean = true,
    metadata?: {
      editorVersion?: SemVer
      createdOn?: Date
      author?: string
      parent?: CommitHash | null
    },
  ): AsyncResult<Commit | null, BookmarkNotFoundError> {
    return Result.fromAsync(async () => {
      const blob = (await Sha256Hash.create(code)) as BlobHash
      const commit = await Commit.create(
        blob,
        new SemVer(CREAGEN_EDITOR_VERSION),
        libraries,
        metadata?.createdOn ?? new Date(),
        typeof metadata?.parent !== 'undefined'
          ? (metadata.parent ?? undefined)
          : this._head?.hash,
        metadata?.author,
      )

      // don't commit if nothing changed
      if (this._head && commit.compareData(this._head)) {
        return Result.ok(null)
      }

      await this.storage.set('commit', commit, commit.hash)
      await this.storage.set('blob', code, commit.blob, this._head?.blob)

      if (updateBookmark) {
        const updateResult = await this.updateActiveBookmark(commit.hash)
        if (!updateResult.ok) {
          return updateResult
        }
      }

      const old = this._head
      this._head = commit

      // Emit global events
      editorEvents.emit('vcs:commit', {
        commit,
        code,
      })
      editorEvents.emit('vcs:checkout', { old, new: commit })
      return Result.ok(commit)
    })
  }

  /**
   * Create a new bookmark on a optional commit and checkout
   *
   * @returns Checkout of `hash` when `hash` is given
   * */
  new(hash?: CommitHash): AsyncResult<Checkout | null, BlobNotFoundError> {
    return Result.fromAsync(async () => {
      const old = this._head
      this._head = hash ? await this.storage.get('commit', hash) : null
      this._activeBookmark = generateUncommittedBookmark()
      editorEvents.emit('vcs:checkout', { old, new: this._head ?? null })

      let data = null
      if (this._head) {
        data = await this.storage.get('blob', this._head.blob)
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
    Checkout,
    CommitNotFoundError | BlobNotFoundError | BookmarkNotFoundError
  >
  checkout(
    ref: Bookmark,
  ): AsyncResult<
    Checkout,
    CommitNotFoundError | BlobNotFoundError | BookmarkNotFoundError
  >
  checkout(
    id: CommitHash | Bookmark,
  ): AsyncResult<
    Checkout,
    CommitNotFoundError | BlobNotFoundError | BookmarkNotFoundError
  >
  checkout(
    id: CommitHash | Bookmark,
  ): AsyncResult<
    Checkout,
    CommitNotFoundError | BlobNotFoundError | BookmarkNotFoundError
  > {
    return Result.fromAsync(async () => {
      const hash = isBookmark(id) ? id.commit : id
      let bookmark
      if (isBookmark(id)) {
        bookmark = id

        id = id.commit
      }

      const commit =
        id === this._head?.hash // use head if it matches to prevent storage call
          ? this._head
          : await this.storage.get('commit', id)
      if (commit === null) return Result.error(new CommitNotFoundError(hash))
      const data = await this.storage.get('blob', commit.blob)
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

      const old = this._head
      this._head = commit

      // Emit global events
      editorEvents.emit('vcs:checkout', { old, new: commit })

      return Result.ok({ commit, data })
    })
  }
}
