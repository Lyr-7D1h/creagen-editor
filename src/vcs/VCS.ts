import { Commit, CommitHash, Checkout as Checkout, BlobHash } from './Commit'
import { createContextLogger } from '../logs/logger'
import { Library } from '../settings/SettingsConfig'
import { isBookmark, Bookmark, Bookmarks } from './Bookmarks'
import { editorEvents } from '../events/events'
import { generateHumanReadableName } from './generateHumanReadableName'
import { ClientStorage } from '../storage/ClientStorage'
import { Sha256Hash } from '../Sha256Hash'
import { SemVer } from 'semver'

export type HistoryItem = {
  commit: Commit
  bookmarks: Bookmark[]
}

/** Active Reference, a reference that might not be comitted yet */
export type ActiveBookmark = Omit<Bookmark, 'commit'> & {
  /** If set it means that the ref is stored otherwise it is an uncommited bookmark */
  commit: CommitHash | null
}

const logger = createContextLogger('vcs')

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
  async addBookmark(
    name: string,
    commit: CommitHash,
  ): Promise<Bookmark | null> {
    if (this.bookmarks.getBookmark(name) !== null) {
      logger.warn(`Bookmark '${name}' already exists`)
      return null
    }
    const bookmark: Bookmark = { name, commit, createdOn: new Date() }
    this.bookmarks.add(bookmark)
    await this.storage.set('bookmarks', this.bookmarks)
    editorEvents.emit('vcs:bookmark-update', undefined)
    return bookmark
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

  async renameBookmark(oldName: string, newName: string) {
    const bookmark = this.bookmarks.getBookmark(oldName)
    if (
      bookmark === null &&
      oldName === this.activeBookmark.name &&
      this.activeBookmark.commit === null
    ) {
      this.activeBookmark.name = newName
      return true
    }
    if (bookmark === null) return null

    if (this.bookmarks.getBookmark(newName) !== null) {
      logger.warn(`Bookmark '${newName}' already exists`)
      return null
    }

    // if not yet commited change active bookmark name
    if (oldName === this._activeBookmark.name) {
      this.activeBookmark.name = newName
      return true
    }

    const newBookmark = this.bookmarks.rename(oldName, newName)
    if (newBookmark === null) {
      logger.error(`Failed to update bookmark from ${oldName} to ${newName}`)
      return null
    }
    if (this._activeBookmark.name === oldName) {
      this._activeBookmark = newBookmark as ActiveBookmark
    }
    await this.storage.set('bookmarks', this.bookmarks)
    editorEvents.emit('vcs:bookmark-update', undefined)
    return true
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
  private async updateActiveBookmark(commit: CommitHash) {
    if (this.activeBookmark.commit === null) {
      // commit uncomitted bookmark
      const ref: Bookmark = { ...this._activeBookmark, commit }
      this.bookmarks.add(ref)
      this._activeBookmark = ref as ActiveBookmark
    } else {
      // update currently active to this commit
      const newBookmark = this.bookmarks.update(
        this.activeBookmark.name,
        commit,
      )
      if (newBookmark === null) return null
      this._activeBookmark = newBookmark
    }

    await this.storage.set('bookmarks', this.bookmarks)
    editorEvents.emit('vcs:bookmark-update', undefined)
    return
  }

  /** Create a new commit and update the head to this commit */
  async commit(
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
  ): Promise<null | Commit> {
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
    if (this._head && commit.compareData(this._head)) return null

    await this.storage.set('commit', commit, commit.hash)
    await this.storage.set('blob', code, commit.blob, this._head?.blob)

    if (updateBookmark) {
      if ((await this.updateActiveBookmark(commit.hash)) === null) {
        return null
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
    return commit
  }

  /**
   * Create a new bookmark on a optional commit and checkout
   *
   * @returns
   * */
  async new(hash?: CommitHash): Promise<Checkout | null> {
    const old = this._head
    this._head = hash ? await this.storage.get('commit', hash) : null
    this._activeBookmark = generateUncommittedBookmark()
    editorEvents.emit('vcs:checkout', { old, new: this._head ?? null })

    let data = null
    if (this._head) {
      data = await this.storage.get('blob', this._head.blob)
      if (data === null)
        throw Error(`Could not find blob: ${this._head.blob.toHex()}`)
    }
    return this._head && data != null
      ? {
          data,
          commit: this._head,
        }
      : null
  }

  /**
   * Checkout a `Bookmark` or `Commit`
   *
   * Checking out a `Commit` will set the active `Bookmark` to that commit
   * */
  checkout(id: CommitHash): Promise<Checkout | null>
  checkout(ref: Bookmark): Promise<Checkout | null>
  checkout(id: CommitHash | Bookmark): Promise<Checkout | null>
  async checkout(id: CommitHash | Bookmark): Promise<Checkout | null> {
    let bookmark
    if (isBookmark(id)) {
      bookmark = id

      id = id.commit
    }

    const commit =
      id === this._head?.hash // use head if it matches to prevent storage call
        ? this._head
        : await this.storage.get('commit', id)
    if (commit === null) return null
    const data = await this.storage.get('blob', commit.blob)
    if (data === null) return null

    if (bookmark) {
      this._activeBookmark = bookmark
    } else if (this._activeBookmark.commit !== null) {
      // set current active bookmark to this commit unless the bookmark is uncomitted
      if ((await this.updateActiveBookmark(commit.hash)) === null) {
        return null
      }
    }

    const old = this._head
    this._head = commit

    // Emit global events
    editorEvents.emit('vcs:checkout', { old, new: commit })

    return { commit, data }
  }
}
