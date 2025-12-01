import {
  Commit,
  CommitHash,
  Checkout as Checkout,
  BlobHash,
  commitHashSchema,
} from './Commit'
import { createContextLogger } from '../logs/logger'
import { Library } from '../settings/SettingsConfig'
import { isBookmark, Bookmark, Bookmarks } from './Bookmarks'
import { editorEvents } from '../events/events'
import { generateHumanReadableName } from './generateHumanReadableName'
import { ClientStorage } from '../storage/ClientStorage'
import { Settings } from '../settings/Settings'
import { Sha256Hash } from '../Sha256Hash'
import { compressToBase64, decompressFromBase64 } from 'lz-string'
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
  static async create(storage: ClientStorage, settings: Settings) {
    const bms = (await storage.get('bookmarks')) ?? new Bookmarks([])

    return new VCS(storage, settings, bms, generateUncommittedBookmark())
  }

  private _head: Commit | null = null
  private constructor(
    private readonly storage: ClientStorage,
    private readonly settings: Settings,
    private readonly _bookmarks: Bookmarks,
    private _activeBookmark: ActiveBookmark,
  ) {}

  /** Create data if it does not exist yet */
  private async updateFromUrlData(
    commitHash: CommitHash,
    {
      code,
      bookmarkName,
      commit,
    }: {
      code: string
      bookmarkName: string
      commit: Commit
    },
  ) {
    if (commitHash.compare(commit.hash) === false) {
      logger.error('Commit from data is not matching commit from base')
      return null
    }

    // if commit already exists ignore
    if ((await this.storage.get('commit', commit.hash)) !== null) {
      return null
    }

    logger.info('Creating commit from data', {
      bookmark: bookmarkName,
      dataLength: DataTransfer.length,
      libraries: JSON.stringify(commit.libraries),
    })
    // if bookmark doesn't exist use the name as temporary placeholder
    if (this.bookmarks.getBookmark(bookmarkName) === null) {
      this._activeBookmark = {
        name: bookmarkName,
        createdOn: new Date(),
        commit: null,
      }
    }
    return await this.commit(code, commit.libraries, false)
  }

  /** update current state from url */
  async updateFromUrl() {
    const path = window.location.pathname.replace('/', '')

    if (path.length === 0) return null

    const { commitHash, data } = await this.fromUrlPath()

    if (commitHash.success === false) {
      logger.error('Invalid commit hash given: ', commitHash.error)
      return null
    }

    let commit: Commit | null = null
    if (data !== null)
      commit = await this.updateFromUrlData(commitHash.data, data)

    commit ??= await this.storage.get('commit', commitHash.data)

    if (commit === null) {
      logger.error(`${commitHash.data.toSub()} not found`)
      return null
    }

    const ref = this.bookmarks.bookmarkLookup(commit.hash)
    if (ref !== null) {
      // TODO: select bookmark most recently used
      this._activeBookmark = ref[0]! as ActiveBookmark
    }

    // set head to commit
    this._head = commit
    return
  }

  private async fromUrlPath() {
    const path = window.location.pathname.replace('/', '')
    let parts = path.split(':')
    const commitHash = commitHashSchema.safeParse(parts[0])

    if (typeof parts[1] === 'undefined' || parts[1].length === 0)
      return { commitHash, data: null }

    let decompressed = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    decompressed =
      decompressed + '==='.slice(0, (4 - (decompressed.length % 4)) % 4)
    decompressed = decompressFromBase64(decompressed)
    parts = decompressed.split('~')

    if (parts.length < 3) {
      logger.error(
        'Failed to parse data from url: expecting 3 parts in url with data',
      )
      return { commitHash, data: null }
    }
    const code = parts[0]!
    const bookmarkName = parts[1]!
    const commit = await Commit.fromInnerString(parts[2]!)
    if (typeof commit === 'string') {
      logger.error(
        `Failed to parse data from url: failed to parse commit '${commit}'`,
      )
      return { commitHash, data: null }
    }
    return {
      commitHash,
      data: {
        code,
        bookmarkName,
        commit,
      },
    }
  }

  private toUrlPath(data?: string) {
    if (!this._head) return ''

    if (this.settings.get('editor.code_in_url')) {
      const ext = `${data}~${this._activeBookmark.name}~${this._head.toInnerString()}`
      const compressed = compressToBase64(ext)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      return `${this._head.toHex()}:${compressed}`
    } else {
      return `${this._head.toHex()}`
    }
  }

  updateUrl(data?: string) {
    const path = this.toUrlPath(data)

    const url = new URL(window.location.href)
    // only push to history if path changed to prevent duplicates
    if (path === url.pathname) {
      return
    }

    url.pathname = path
    window.history.pushState('Creagen', '', url)
  }

  get head() {
    return this._head
  }

  get activeBookmark() {
    return this._activeBookmark
  }

  async addBookmark(name: string, commit: CommitHash) {
    if (this.bookmarks.getBookmark(name) !== null) {
      logger.warn(`Bookmark '${name}' already exists`)
      return null
    }
    this.bookmarks.add({ name, commit, createdOn: new Date() })
    await this.storage.set('bookmarks', this.bookmarks)
    editorEvents.emit('vcs:bookmark-update', undefined)
    return true
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
   * update current active bookmark to this commit, or commit the bookmark
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

  async commit(
    code: string,
    libraries: Library[],
    updateBookmark: boolean = true,
  ): Promise<null | Commit> {
    const blob = (await Sha256Hash.create(code)) as BlobHash
    const commit = await Commit.create(
      blob,
      new SemVer(CREAGEN_EDITOR_VERSION),
      libraries,
      new Date(),
      this._head?.hash,
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

    this.updateUrl(code)

    // Emit global events
    editorEvents.emit('vcs:commit', {
      commit,
      code,
    })
    editorEvents.emit('vcs:checkout', { old, new: commit })
    return commit
  }

  /**
   * Create a new bookmark on a optional commit
   *
   * @returns
   * */
  async new(hash?: CommitHash): Promise<Checkout | null> {
    const old = this._head
    this._head = hash ? await this.storage.get('commit', hash) : null
    this._activeBookmark = generateUncommittedBookmark()
    this.updateUrl()
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

  /** Checkout a bookmark or ID */
  checkout(id: CommitHash, updateHistory?: boolean): Promise<Checkout | null>
  checkout(ref: Bookmark, updateHistory?: boolean): Promise<Checkout | null>
  checkout(
    id: CommitHash | Bookmark,
    updateHistory?: boolean,
  ): Promise<Checkout | null>
  async checkout(
    id: CommitHash | Bookmark,
    updateUrlHistory = true,
  ): Promise<Checkout | null> {
    let bookmark
    if (isBookmark(id)) {
      bookmark = id
      // eslint-disable-next-line no-param-reassign
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

    if (updateUrlHistory) this.updateUrl(data)

    // Emit global events
    editorEvents.emit('vcs:checkout', { old, new: commit })

    return { commit, data }
  }
}
