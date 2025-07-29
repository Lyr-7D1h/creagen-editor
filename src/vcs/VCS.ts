import {
  Commit,
  CommitHash,
  Checkout as Checkout,
  BlobHash,
  commitHashSchema,
} from './Commit'
import { createContextLogger } from '../logs/logger'
import { Library } from '../settings/SettingsConfig'
import { isRef, Bookmark, Bookmarks } from './Bookmarks'
import { editorEvents } from '../events/events'
import { generateHumanReadableName } from './generateHumanReadableName'
import { ClientStorage } from '../storage/ClientStorage'
import { Settings } from '../settings/Settings'
import { Sha256Hash } from '../Sha256Hash'
import { CREAGEN_EDITOR_VERSION } from '../env'
import { compressToBase64, decompressFromBase64 } from 'lz-string'

export type HistoryItem = {
  commit: Commit
  bookmarks: Bookmark[]
}

/** Active Reference, a reference that might not be comitted yet */
export type ActiveBookmark = Omit<Bookmark, 'commit'> & {
  /** If set it means that the ref is stored */
  commit?: CommitHash
}

const logger = createContextLogger('vcs')

/** Version Control Software for creagen-editor */
export class VCS {
  static async create(storage: ClientStorage, settings: Settings) {
    const bms = (await storage.get('bookmarks')) ?? new Bookmarks([])
    const activeBookmark = {
      name: generateHumanReadableName(),
      createdOn: new Date(),
    }

    return new VCS(storage, settings, bms, activeBookmark)
  }

  private _head: Commit | null = null
  private constructor(
    private readonly storage: ClientStorage,
    private readonly settings: Settings,
    private readonly _bookmarks: Bookmarks,
    private _activeBookmark: ActiveBookmark,
  ) {}

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

    logger.info(
      `Creating commit from data '${code.length}' and libraries '${JSON.stringify(commit.libraries)}' from url`,
    )
    if (this.bookmarks.getBookmark(bookmarkName) === null) {
      const bookmark: Bookmark = {
        name: bookmarkName,
        createdOn: new Date(),
        commit: commit.hash,
      }
      this.bookmarks.add(bookmark)
      this._activeBookmark = bookmark
      await this.storage.set('bookmarks', this.bookmarks)
    }
    this.commit(code, commit.libraries)
    await this.storage.set('commit', commit, commit.hash)
    return true
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

    if (data !== null) {
      if ((await this.updateFromUrlData(commitHash.data, data)) === true) return
    }

    const commit = await this.storage.get('commit', commitHash.data)
    if (commit === null) {
      logger.error(`${commitHash.data.toSub()} not found`)
      return null
    }

    const ref = this.bookmarks.bookmarkLookup(commit?.hash)
    if (ref !== null) {
      // TODO: select bookmark most recently used
      this._activeBookmark = ref[0]!
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

  private toUrlPath(data: string) {
    if (!this._head) return null

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

  private updateUrl(data: string) {
    const path = this.toUrlPath(data)
    if (path === null) return

    const url = new URL(window.location as any)
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
    editorEvents.emit('vcs:bookmarkUpdate', undefined)
    return true
  }

  async renameBookmark(oldName: string, newName: string) {
    const bookmark = this.bookmarks.getBookmark(oldName)

    if (this.bookmarks.getBookmark(newName) !== null) {
      logger.warn(`Bookmark '${newName}' already exists`)
      return null
    }

    // if not yet commited change active bookmark name
    if (oldName === this._activeBookmark.name && bookmark === null) {
      this.activeBookmark.name = newName
      return true
    }

    if (!bookmark) return false
    bookmark.name = newName
    await this.storage.set('bookmarks', this.bookmarks)
    editorEvents.emit('vcs:bookmarkUpdate', undefined)
    return true
  }

  get bookmarks() {
    if (this._bookmarks === null) throw Error('VCS not yet loaded')
    return this._bookmarks
  }

  /**
   * Get history
   * @param n - How far to go back
   */
  async history(n: number): Promise<HistoryItem[]> {
    let next = this._head
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

  /** update current active bookmark to this commit */
  private async updateActiveBookmark(commit: CommitHash) {
    const newBookmark = this.bookmarks.update(this.activeBookmark.name, commit)
    if (newBookmark === null) {
      logger.error(`Failed to update active bookmark`)
      return null
    }
    this._activeBookmark = newBookmark
    await this.storage.set('bookmarks', this.bookmarks)
    editorEvents.emit('vcs:bookmarkUpdate', undefined)
    return
  }

  async commit(code: string, libraries: Library[]): Promise<null | Commit> {
    const blob = (await Sha256Hash.create(code)) as BlobHash

    // don't commit with same content
    if (
      this._head &&
      this._head.blob.compare(blob) &&
      libraries.every(
        (l) =>
          this._head!.libraries.findIndex(
            (hl) => l.name === hl.name && l.version.compare(hl.version) === 0,
          ) !== -1,
      )
    )
      return null

    const commit = await Commit.create(
      blob,
      CREAGEN_EDITOR_VERSION,
      libraries,
      new Date(),
      this._head?.hash,
    )
    logger.debug('commit')

    await this.storage.set('commit', commit, commit.hash)
    await this.storage.set('blob', code, commit.blob)

    // if current bookmark is uncomitted
    if (typeof this._activeBookmark.commit === 'undefined') {
      const ref: Bookmark = { ...this._activeBookmark, commit: commit.hash }
      this.bookmarks.add(ref)
      this._activeBookmark = ref
      await this.storage.set('bookmarks', this.bookmarks)
    } else {
      if ((await this.updateActiveBookmark(commit.hash)) === null) {
        return null
      }
    }

    const old = this._head
    this._head = commit

    this.updateUrl(code)

    // Emit global events
    editorEvents.emit('vcs:bookmarkUpdate', undefined)
    editorEvents.emit('vcs:commit', {
      commit,
      code,
    })
    editorEvents.emit('vcs:checkout', { old, new: commit })
    return commit
  }

  /** Checkout a Ref or ID */
  checkout(id: CommitHash, updateHistory?: boolean): Promise<Checkout | null>
  checkout(ref: Bookmark, updateHistory?: boolean): Promise<Checkout | null>
  checkout(
    id: CommitHash | Bookmark,
    updateHistory?: boolean,
  ): Promise<Checkout | null>
  async checkout(
    id: CommitHash | Bookmark,
    updateHistory = true,
  ): Promise<Checkout | null> {
    let bookmark
    if (isRef(id)) {
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
    } else {
      // if not checking out a bookmark set current active bookmark to this commit
      if ((await this.updateActiveBookmark(commit.hash)) === null) {
        return null
      }
    }

    const old = this._head
    this._head = commit

    if (updateHistory) this.updateUrl(data)

    // Emit global events
    editorEvents.emit('vcs:checkout', { old, new: commit })

    return { commit, data }
  }
}
