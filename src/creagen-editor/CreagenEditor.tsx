import { SemVer } from 'semver'
import type { AsyncResult } from 'typescript-result'
import { Result } from 'typescript-result'
import type {
  BookmarkAlreadyExistsError,
  BookmarkNotFoundError,
  Commit,
  CommitHash,
  IndexdbImport,
  ParseError,
  VersieStorageError,
} from 'versie'
import { Bookmark, Versie } from 'versie'
import z from 'zod'
import { Controller } from '../controller/Controller'
import { Editor } from '../editor/Editor'
import { editorEvents } from '../events/events'
import type { LibraryImport } from '../importer'
import { Importer } from '../importer'
import { log, logger, Severity } from '../logs/logger'
import { Params } from '../params/Params'
import { Sandbox } from '../sandbox/Sandbox'
import { Settings } from '../settings/Settings'
import type { Library, SettingsParam } from '../settings/SettingsConfig'
import { DEFAULT_SETTINGS_CONFIG } from '../settings/SettingsConfig'
import { LocalClientStorage } from '../storage/LocalClientStorage'
import { RemoteClientStorage } from '../storage/RemoteClientStorage'
import { UrlMutator } from '../UrlMutator'
import type { Command } from './commands'
import { COMMANDS } from './commands'
import { CommitMetadata } from './CommitMetadata'
import { creagenEditorVersionMismatch as creagenEditorVersionMismatchWarning } from './creagenEditorVersionMatches'
import { generateHumanReadableName } from './generateHumanReadableName'
import type { CustomKeybinding } from './keybindings'
import { Keybindings } from './keybindings'
import { LIBRARY_CONFIGS } from './libraryConfigs'
import { parseCode } from './parseCode'
import { ResourceMonitor } from './ResourceMonitor'
import { updateFromUrl } from './updateFromUrl'

function generateUncommittedBookmark() {
  return {
    name: generateHumanReadableName(),
    createdOn: new Date(),
    commit: null,
  }
}

/** Active bookmark, a bookmark that might not be committed */
export type ActiveBookmark = {
  name: string
  createdOn: Date
  /** If set it means that the ref is stored otherwise it is an uncommitted bookmark */
  commit: CommitHash | null
}

export type ClientStorage = LocalClientStorage | RemoteClientStorage

export class CreagenEditor {
  resourceMonitor = new ResourceMonitor()
  params: Params
  storage: ClientStorage
  settings: Settings
  editor: Editor
  sandbox: Sandbox

  private readonly vcs: Versie<CommitMetadata>
  activeBookmark: ActiveBookmark = generateUncommittedBookmark()

  keybindings: Keybindings
  controller: Controller | null

  // private commands: Map<string, (editor: CreagenEditor) => void> = new Map()
  libraryImports: Map<string, LibraryImport> = new Map()

  static async create() {
    const sandbox = Sandbox.create()
    const storage =
      CREAGEN_REMOTE_URL != null
        ? await RemoteClientStorage.create()
        : await LocalClientStorage.create()
    const settings = await Settings.create(storage)
    const editor = Editor.create(settings)

    const vcsResult = await Versie.create(storage, (raw) => {
      return CommitMetadata.parse(raw)
    })
    if (!vcsResult.ok) throw vcsResult.error
    const vcs = vcsResult.value
    const customKeybindings = (await storage.getCustomKeybindings()) ?? []

    return new CreagenEditor(
      sandbox,
      editor,
      settings,
      storage,
      vcs,
      customKeybindings,
    )
  }

  private constructor(
    sandbox: Sandbox,
    editor: Editor,
    settings: Settings,
    storage: ClientStorage,
    versie: Versie<CommitMetadata>,
    customKeybindings: CustomKeybinding[],
  ) {
    this.sandbox = sandbox
    this.editor = editor
    this.settings = settings
    this.storage = storage
    this.vcs = versie
    this.keybindings = new Keybindings(customKeybindings, this)
    this.controller =
      CREAGEN_EDITOR_CONTROLLER_URL != null
        ? new Controller(CREAGEN_EDITOR_CONTROLLER_URL)
        : null
    this.params = new Params(this.controller ?? undefined)

    // add creagen types
    this.editor.addTypings(Params.TYPINGS, 'creagen-editor')

    this.updateFromUrl()
      .then(() => {
        if (this.settings.get('editor.init_render')) {
          this.render().catch(logger.error)
        } else if (this.settings.get('params.auto_render')) {
          const code = this.editor.getValue()
          this.parseCode(code)
        }
      })
      .catch(logger.error)

    if (this.settings.get('sandbox.resource_monitor'))
      this.resourceMonitor.listen()
    if (this.controller && this.settings.get('controller.enabled'))
      this.setupController().catch(logger.error)

    // Setup listener for updating code from history
    window.addEventListener('popstate', () => {
      this.updateFromUrl().catch(logger.error)
    })

    // Listen to setting changes
    editorEvents.on('settings:changed', ({ key, value }) => {
      if (this.controller && key === 'controller.enabled') {
        if (value as boolean) {
          this.setupController().catch(logger.error)
        } else {
          this.controller.disconnect()
        }
      }

      if (key === 'sandbox.resource_monitor') {
        if (value as boolean) {
          this.resourceMonitor.listen()
        } else {
          this.resourceMonitor.stopListening()
        }
      }

      if (this.settings.isParam(key)) {
        const config = this.settings.config[key] as SettingsParam
        if (typeof config.fromQueryParam !== 'undefined') {
          const url = new UrlMutator()
          if (value === null || url.getSetting(key) === value) return

          // remove query param if it is also the default behavior
          if ((DEFAULT_SETTINGS_CONFIG[key] as SettingsParam).value === value) {
            url.removeSetting(key)
          } else {
            url.setSetting(key, value)
          }
          url.replaceState()
        }
      }
    })
  }

  /** Update creagen from url data */
  private async updateFromUrl() {
    await updateFromUrl(this)
  }

  private setActiveBookmark(bookmark: ActiveBookmark) {
    this.activeBookmark = bookmark
    editorEvents.emit('vcs:active-bookmark-update', undefined)
  }

  /**
   * Update current active bookmark to this commit, storing it if it wasn't pointing to anything
   */
  private updateActiveBookmarkToCommit(
    commit: CommitHash,
  ): AsyncResult<
    void,
    | BookmarkNotFoundError
    | VersieStorageError
    | BookmarkAlreadyExistsError
    | ParseError
  > {
    return Result.fromAsync(async () => {
      if (this.activeBookmark.commit === null) {
        const bookmark = new Bookmark(
          this.activeBookmark.name,
          commit,
          this.activeBookmark.createdOn,
        )
        // commit uncommitted bookmark
        const result = await this.vcs.addBookmark(bookmark)
        if (!result.ok) return result
        this.setActiveBookmark(result.value)
        return Result.ok()
      }

      // update currently active to this commit
      const result = await this.vcs.setBookmarkCommit(
        this.activeBookmark.name,
        commit,
      )
      if (!result.ok) return result
      this.setActiveBookmark(result.value)
      return Result.ok()
    })
  }

  private async setupController() {
    if (!this.controller) return
    if (this.controller.open()) return

    const controllerId = await this.controller.create()
    await this.controller.connect(controllerId)
    editorEvents.emit('controller:connected', undefined)
    this.controller.onMessage((msg) => {
      switch (msg.type) {
        case 'editor:param-delete':
        case 'editor:param-add':
        case 'editor:param-value':
        case 'editor:param-regen-interval':
        case 'editor:state': {
          return
        }

        case 'client:param-value': {
          this.params.setValue(msg.key, msg.value)
          editorEvents.emit('params:value', undefined)
          if (this.settings.get('params.auto_render')) {
            this.render().catch(logger.error)
          }
          return
        }
        case 'client:statereq':
          this.controller!.send({
            type: 'editor:state',
            values: [...this.params.store.entries()],
            configs: [...this.params.configs.entries()],
            regenInterval: this.params.regenInterval,
          })
          return
        case 'client:param-regen-interval':
          this.params.setRegenInterval(msg.interval)
          editorEvents.emit('params:value', undefined)
          return
        case 'connection':
        case 'disconnection':
          return
        case 'error':
          logger.error(msg.error)
      }
    })
  }

  /** Create new sketch on an optional base commit */
  async new() {
    return Result.fromAsyncCatching(async () => {
      const old = this.vcs.head?.hash
      const res = await this.vcs.setHead(null)
      if (!res.ok) return res
      // clear everything
      this.editor.setValue('')
      await this.loadLibraries([])
      new UrlMutator().setCommit().pushState(null, this.activeBookmark.name)
      this.setActiveBookmark(generateUncommittedBookmark())
      editorEvents.emit('vcs:checkout', { old })
      return Result.ok()
    })
  }
  /** Load a commit into editor */
  private async loadCommit(hash: CommitHash) {
    const old = this.vcs.head?.hash

    const checkoutResult = await this.vcs.checkout(hash)
    if (!checkoutResult.ok) {
      return checkoutResult
    }
    const checkout = checkoutResult.value

    const {
      commit: {
        metadata: { editorVersion, libraries },
      },
      data,
    } = checkout
    creagenEditorVersionMismatchWarning(editorVersion)

    // update libraries from commit
    await this.loadLibraries(libraries)

    this.editor.setValue(data)
    editorEvents.emit('vcs:checkout', { old, new: checkout.commit.hash })
    return Result.ok()
  }

  async checkoutBookmark(bookmarkName: string, username?: string) {
    let bookmark: Bookmark | null
    if (
      username &&
      this.storage.remote &&
      this.storage.user?.username !== username
    ) {
      // if checkout out a specific other user bookmark always fetch from remote
      bookmark = await this.storage.getBookmarkUser(username, bookmarkName)
    } else {
      // get through traditional vcs route
      bookmark = this.vcs.getBookmark(bookmarkName)
    }

    if (bookmark === null)
      throw new Error(
        `Bookmark ${bookmarkName} ${username ? 'from ' + username : ''} not found`,
      )

    await this.loadCommit(bookmark.commit)
    this.setActiveBookmark(bookmark)
    // set url
    const mutator = new UrlMutator()
    if (this.vcs.head)
      mutator.setBookmark(
        bookmark.name,
        username ?? this.storage.user?.username,
      )
    mutator.pushState(null, this.activeBookmark.name)

    return bookmark
  }

  /**
   * Checkout a sketch by commit
   */
  async checkoutCommitHeadless(hash: CommitHash): Promise<void> {
    await this.loadCommit(hash)

    // set url
    const mutator = new UrlMutator()
    if (this.vcs.head) mutator.setCommit(this.vcs.head.hash.toHex())
    mutator.pushState(null, this.activeBookmark.name)

    this.setActiveBookmark(generateUncommittedBookmark())
  }

  /** Reset all editor typings */
  async resetTypings() {
    this.editor.clearTypings()

    const typings = await Promise.allSettled(
      Array.from(this.libraryImports.values(), (l) => l.typings()),
    )
    const libs = [...this.libraryImports.keys()]
    let i = -1
    for (const t of typings) {
      i++
      const name = libs[i]
      if (t.status === 'rejected') {
        logger.error(`Failed to retreive types for ${name}: ${t.reason}`)
        continue
      }
      if (t.value != null) {
        this.editor.addTypings(t.value, `ts:${name}.d.ts`)
      }
    }
  }

  /**
   * Add a library to the project and load its typings, replaces the same library if different version
   *
   * Note: Ensure to load library typings for editor type support
   */
  async addLibrary(lib: Library) {
    const { name, version } = lib

    const current = this.libraryImports.get(name)
    if (current) {
      // return if already exists with same version
      if (current.version.compare(version) === 0) {
        return Promise.resolve(this.libraryImports.get(name)!)
      }
      // otherwire remove
      this.removeLibrary(lib.name)
    }

    logger.debug('Adding library', lib)
    // set template if selecting library for the first time
    if (this.editor.getValue() === '' && lib.name in LIBRARY_CONFIGS) {
      const config = LIBRARY_CONFIGS[lib.name]
      if (config?.template != null) {
        this.editor.setValue(config.template)
      }
    }

    // set template if selecting library for the first time
    if (this.editor.getValue() === '' && name in LIBRARY_CONFIGS) {
      const config = LIBRARY_CONFIGS[name]
      if (config?.template != null) {
        this.editor.setValue(config.template)
      }
    }

    return new Promise<LibraryImport>((resolve, reject) => {
      Importer.getLibrary(name, version)
        .then((library) => {
          logger.trace('Library import', library)
          if (library === null) {
            reject(new Error(`Library ${name} not found`))
            return
          }

          library
            .typings()
            .then((typings) => {
              if (typings != null) {
                this.editor.addTypings(typings, `ts:${library.name}.d.ts`)
              }
            })
            .catch(logger.error)

          this.libraryImports.set(name, library)
          editorEvents.emit('deps:add', library.name)
          resolve(library)
        })
        .catch(reject)
    })
  }

  removeLibrary(libName: string) {
    this.libraryImports.delete(libName)
    this.editor.removeTypings(`ts:${libName}.d.ts`)
    editorEvents.emit('deps:remove', libName)
  }

  /**
   * Load all libraries given and remove existing ones not in given set
   * */
  async loadLibraries(libraries: Library[]) {
    // remove existing libraries
    for (const li of this.libraryImports.values()) {
      const exists = libraries.some(
        (l) => l.name === li.name && l.version.compare(li.version) === 0,
      )
      if (!exists) {
        this.removeLibrary(li.name)
      }
    }

    const libPromises = await Promise.allSettled(
      libraries.map((l) => this.addLibrary(l)),
    )

    libPromises.forEach((result, i) => {
      if (result.status === 'rejected') {
        logger.error(`Failed to load: ${libraries[i]!.name}: ${result.reason}`)
      }
    })
  }

  parseCode(code: string) {
    code = parseCode(code, this.libraryImports, this.params)
    this.params.save()
    editorEvents.emit('params:config', undefined)
    return code
  }

  async formatCode() {
    await this.editor.format()
  }

  /**
   * Commit code and library changes if editor is not empty
   */
  async commit() {
    const code = this.editor.getValue()
    if (code.length === 0) return null

    const libraries = [...this.libraryImports.values()]
    const metadata = new CommitMetadata(
      new SemVer(CREAGEN_EDITOR_VERSION),
      libraries,
      this.storage instanceof RemoteClientStorage
        ? this.storage.user?.username
        : undefined,
    )
    // store code
    const commitResult = await this.vcs.commit(code, metadata)
    if (!commitResult.ok) {
      throw new Error(`Failed to commit code: ${commitResult.error.message}`)
    }

    this.editor.markClean()

    // Explicitly handle the "no changes" case where commitResult.value is null.
    if (commitResult.value == null) {
      return null
    }

    const commitHash = commitResult.value.hash
    // TODO(perf): Ensure commit and checkout don't make similar components rerender/refetch

    const updateResult = await this.updateActiveBookmarkToCommit(commitHash)
    if (updateResult.ok === false) {
      throw updateResult.error
    }

    new UrlMutator()
      .setBookmark(this.activeBookmark.name, this.storage.user?.username)
      .pushState(null, this.activeBookmark.name)

    editorEvents.emit('vcs:commit', { commit: commitHash })

    return { code, libraries }
  }

  /** Render current code with given libraries */
  async render() {
    const info = log(Severity.Info, 'rendering code', null)
    try {
      let code = this.editor.getValue()
      if (code.length === 0) {
        logger.remove(info)
        return
      }

      const libraries = [...this.libraryImports.values()]
      code = this.parseCode(code)

      await this.sandbox.render(code, libraries)
    } catch (e) {
      logger.error('Failed to render:', e)
      logger.remove(info)
      throw e
    }
    logger.remove(info)
    editorEvents.emit('render', undefined)
  }

  getKeybindKeyString(command: Command) {
    const v = this.keybindings.getKeybindingsToCommand(command)[0]?.key
    if (typeof v === 'undefined') return 'Unset'
    return v
  }

  executeCommand(command: Command) {
    COMMANDS[command].handler(this)
  }

  import(data: unknown) {
    const validated = indexDbSchema.parse(data)
    if (this.storage instanceof LocalClientStorage)
      return this.storage.import(validated as IndexdbImport)
    throw Error('import unsupported')
  }

  export() {
    if (this.storage instanceof LocalClientStorage) return this.storage.export()
    throw Error('export unsupported')
  }

  get head() {
    return this.vcs.head
  }

  getAllBookmarks() {
    return this.vcs.getAllBookmarks()
  }

  getAllCommits() {
    return this.vcs.getAllCommits()
  }

  history(n: number, start?: Commit<CommitMetadata>) {
    return this.vcs.history(n, start)
  }

  getBookmark(name: string) {
    return this.vcs.getBookmark(name)
  }

  /**
   * Set the commit of a bookmark
   *
   * if this bookmark is active it will load in the commit
   */
  async setBookmarkCommit(bookmarkName: string, commit: CommitHash) {
    // if in headless mode (active uncomitted bookmark) set the url to the commit
    if (
      bookmarkName === this.activeBookmark.name &&
      this.activeBookmark.commit === null
    ) {
      const res = await this.loadCommit(commit)
      if (!res.ok) throw res.error
      new UrlMutator()
        .setCommit(commit.toHex())
        .pushState(undefined, this.activeBookmark.name)
      return this.activeBookmark
    }

    const res = await this.vcs.setBookmarkCommit(bookmarkName, commit)
    if (!res.ok) throw res.error
    const bookmark = res.value

    if (bookmarkName === this.activeBookmark.name) {
      await this.loadCommit(commit)
      this.setActiveBookmark(bookmark)
    }
    return bookmark
  }

  addBookmark(bookmark: Bookmark) {
    return this.vcs.addBookmark(bookmark)
  }

  bookmarkLookup(commit: CommitHash) {
    return this.vcs.bookmarkLookup(commit)
  }

  async removeBookmark(name: string) {
    const result = await this.vcs.removeBookmark(name)

    if (!result.ok) throw result.error
    // If removing the current active bookmark, generate a new one
    if (this.activeBookmark.name === name) {
      this.setActiveBookmark(generateUncommittedBookmark())
    }
    editorEvents.emit('vcs:bookmark-update', undefined)
    return result
  }

  async renameBookmark(oldName: string, newName: string) {
    // if changing active bookmark and uncommited, only change in memory
    if (
      this.activeBookmark.commit === null &&
      oldName === this.activeBookmark.name
    ) {
      this.setActiveBookmark({ ...this.activeBookmark, name: newName })
      editorEvents.emit('vcs:bookmark-update', undefined)
      return
    }
    const result = await this.vcs.renameBookmark(oldName, newName)
    if (!result.ok) throw result.error
    if (oldName === this.activeBookmark.name) {
      this.setActiveBookmark({ ...this.activeBookmark, name: newName })
    }
    editorEvents.emit('vcs:bookmark-update', undefined)
    return result
  }

  /** Low-level commit used when building a commit from external data (e.g. a sharable link) */
  createCommit(code: string, metadata: CommitMetadata) {
    return this.vcs.commit(code, metadata)
  }
}

const indexDbSchema = z.object({
  version: z.number(),
  bookmarks: z.unknown().array(),
  commits: z.unknown().array(),
  blobs: z.unknown().array(),
  delta: z.unknown().array(),
})
