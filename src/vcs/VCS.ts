import { Commit, CommitHash, Checkout as Checkout, BlobHash } from './Commit'
import { createContextLogger } from '../logs/logger'
import { Library } from '../settings/SettingsConfig'
import { isRef, Bookmark, Bookmarks } from './Bookmarks'
import { editorEvents } from '../events/events'
import { generateHumanReadableName } from './generateHumanReadableName'
import { ClientStorage } from '../storage/ClientStorage'
import { Settings } from '../settings/Settings'
import { Sha256Hash } from '../Sha256Hash'
import { CREAGEN_EDITOR_VERSION } from '../env'

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

  /** update current state from url */
  async updateFromUrl() {
    const path = window.location.pathname.replace('/', '')

    if (path.length === 0) return null

    const data = await Commit.fromUrlEncodedString(path)

    if (typeof data === 'string') {
      logger.error('Invalid commit given: ', data)
      return null
    }
    if (typeof data.data === 'undefined') {
      logger.error('Invalid data given: ', data)
      return null
    }

    let commit = data.commit
    let extension = this.fromUrlDataExtension(data.data)
    if (extension.refName) {
      const ref = this.bookmarks.getBookmark(extension.refName)
      if (ref === null) {
        logger.error(`${extension.refName} not found`)
      } else {
        this._activeBookmark = ref
      }
    }

    // load data from url
    if (
      extension.data &&
      // only if current commit does not exists load data
      (await this.storage.get('commit', commit.hash)) === null
    ) {
      logger.info(
        `Commiting data with length '${extension.data.length}' and libraries '${JSON.stringify(commit.libraries)}' from url`,
      )
      let c = await this.commit(extension.data, commit.libraries)
      if (c !== null) commit = c
      if (c === null) logger.error(`Failed to commit data from url`)
    }
    // set head to commit after making it to pass similarity check with head
    this._head = commit
    return null
  }

  private fromUrlDataExtension(input: string) {
    const parts = input.split('~')
    return { refName: parts[0], data: parts[1] ?? null }
  }

  private urlDataExtension(data?: string) {
    return `${this._activeBookmark.name}~${data ?? ''}`
  }

  private updateUrl(data: string, updateHistory: boolean = true) {
    if (!this._head) return
    const url = new URL(window.location as any)
    let extension
    if (this.settings.get('editor.code_in_url')) {
      extension = this.urlDataExtension(data)
    } else {
      extension = this.urlDataExtension()
    }
    const path = this._head.toUrlEncodedStringWithData(extension)
    // only push to history if path changed
    if (path === url.pathname) {
      return
    }
    url.pathname = path
    if (updateHistory === true) window.history.pushState('Creagen', '', url)
  }

  get head() {
    return this._head
  }

  get activeBookmark() {
    return this._activeBookmark
  }

  async renameBookmark(oldName: string, newName: string) {
    const ref = this.bookmarks.getBookmark(oldName)

    // if not yet commited change active ref name
    if (ref === null && oldName === this._activeBookmark.name) {
      this.activeBookmark.name = newName
      return
    }

    if (!ref) return false
    ref.name = newName
    await this.storage.set('bookmarks', this.bookmarks)
    editorEvents.emit('vcs:renameRef', undefined)
    return true
  }

  get bookmarks() {
    if (this._bookmarks === null) throw Error('VCS not yet loaded')
    return this._bookmarks
  }

  async refLookup(commit: CommitHash) {
    return this._bookmarks.bookmarkLookup(commit)
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
      // otherwise update currently active bookmark to this new commit
      this._activeBookmark.commit = commit.hash
      await this.storage.set('bookmarks', this.bookmarks)
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
    let ref
    if (isRef(id)) {
      ref = id
      id = id.commit
    }

    const commit =
      id === this._head?.hash // use head if it matches to prevent storage call
        ? this._head
        : await this.storage.get('commit', id)
    if (commit === null) return null
    const data = await this.storage.get('blob', commit.blob)
    if (data === null) return null

    if (ref) this._activeBookmark = ref

    const old = this._head
    this._head = commit

    this.updateUrl(data, updateHistory)

    // Emit global events
    editorEvents.emit('vcs:checkout', { old, new: commit })

    return { commit, data }
  }
}
