import { Editor } from '../editor/Editor'
import { log, logger, Severity } from '../logs/logger'
import { Sandbox } from '../sandbox/Sandbox'
import { Settings } from '../settings/Settings'
import { CommitHash } from '../vcs/Commit'
import { LIBRARY_CONFIGS } from './libraryConfigs'
import { parseCode } from './parseCode'
import {
  DEFAULT_SETTINGS_CONFIG,
  Library,
  SettingsParam,
} from '../settings/SettingsConfig'
import { CustomKeybinding, Keybindings } from './keybindings'
import { Importer, LibraryImport } from '../importer'
import { CommitNotFoundError, VCS } from '../vcs/VCS'
import { ClientStorage } from '../storage/ClientStorage'
import { editorEvents } from '../events/events'
import { Bookmark, isBookmark } from '../vcs/Bookmarks'
import { Command, COMMANDS } from './commands'
import { ResourceMonitor } from '../resource-monitor/ResourceMonitor'
import { Params } from '../params/Params'
import { Controller } from '../controller/Controller'
import { UrlMutator } from '../UrlMutator'
import { updateFromUrl } from './updateFromUrl'
import { creagenEditorVersionMismatch } from './creagenEditorVersionMatches'
import { CommitMetadata } from './CommitMetadata'
import { IndexDBStorage } from '../vcs/IndexDBStorage'
import { SemVer } from 'semver'

export class CreagenEditor {
  resourceMonitor = new ResourceMonitor()
  params: Params
  storage: ClientStorage
  settings: Settings
  editor: Editor
  sandbox: Sandbox
  vcs: VCS<CommitMetadata>
  keybindings: Keybindings
  controller: Controller | null

  // private commands: Map<string, (editor: CreagenEditor) => void> = new Map()
  libraryImports: Map<string, LibraryImport> = new Map()

  static async create() {
    const storage = new ClientStorage()
    const settings = await Settings.create(storage)
    const editor = await Editor.create(settings)
    const sandbox = Sandbox.create()
    const indexdbStorageResult = await IndexDBStorage.create<CommitMetadata>()
    if (!indexdbStorageResult.ok) throw indexdbStorageResult.error
    if (!indexdbStorageResult.value.persisted)
      logger.warn('Failed to persist storage')
    const indexdbStorage = indexdbStorageResult.value.creagen
    const vcsResult = await VCS.create(indexdbStorage, (raw) => {
      return CommitMetadata.parse(raw)
    })
    if (!vcsResult.ok) throw vcsResult.error
    const vcs = vcsResult.value
    const customKeybindings = storage.get('custom-keybindings') ?? []

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
    vcs: VCS<CommitMetadata>,
    customKeybindings: CustomKeybinding[],
  ) {
    this.sandbox = sandbox
    this.editor = editor
    this.settings = settings
    this.storage = storage
    this.vcs = vcs
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

  private async setupController() {
    if (!this.controller) return
    if (this.controller.open()) return

    const id = await this.controller.new()
    await this.controller.connect(id)
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

  /** Create new sketch */
  async new(hash?: CommitHash) {
    const old = this.vcs.head
    const checkoutResult = await this.vcs.new(hash)
    if (!checkoutResult.ok) {
      logger.error(checkoutResult.error)
      return
    }
    const checkout = checkoutResult.value

    // no checkout so empty commit
    if (checkout === null) {
      this.editor.setValue('')
      editorEvents.emit('vcs:checkout', { old, new: null })
      return
    }

    const {
      commit: {
        metadata: { editorVersion, libraries },
      },
      data,
    } = checkout
    creagenEditorVersionMismatch(editorVersion)

    // update libraries from commit
    await this.loadLibraries(libraries)

    this.editor.setValue(data)
    editorEvents.emit('vcs:checkout', { old, new: checkout.commit })
  }

  /**
   * Checkout a sketch by commit or bookmark
   *
   *
   * Checking out by commit will create a new bookmark name
   */
  async checkout(hash: CommitHash): Promise<void>
  async checkout(bookmark: Bookmark): Promise<void>
  async checkout(id: CommitHash | Bookmark) {
    const old = this.vcs.head
    const checkoutResult = await this.vcs.checkout(id)
    if (!checkoutResult.ok) {
      checkoutResult
        .match()
        .when(CommitNotFoundError, () => {
          logger.warn(
            `'${isBookmark(id) ? id.name : id.toSub()}' not found in vcs`,
          )
        })
        .else((error) => {
          logger.error(error)
        })
        .run()
      return
    }
    const checkout = checkoutResult.value

    const {
      commit: {
        metadata: { editorVersion, libraries },
      },
      data,
    } = checkout
    creagenEditorVersionMismatch(editorVersion)

    const mutator = new UrlMutator()
    if (this.vcs.head) mutator.setCommit(this.vcs.head.hash.toHex())
    mutator.pushState(null, this.vcs.activeBookmark.name)

    // update libraries from commit
    await this.loadLibraries(libraries)

    this.editor.setValue(data)
    editorEvents.emit('vcs:checkout', { old, new: checkout.commit })
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
        this.editor.addTypings(t.value, `ts:${name}.d.ts`, name)
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
                this.editor.addTypings(
                  typings,
                  `ts:${library.name}.d.ts`,
                  library.name,
                )
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

  /** Commit code and library changes if editor is not empty
   *
   * @returns null if nothing changed
   */
  async commit() {
    if (this.settings.values['editor.format_on_render'] != null) {
      await this.editor.format()
    }

    const old = this.vcs.head
    const code = this.editor.getValue()
    if (code.length === 0) return null

    const libraries = [...this.libraryImports.values()]
    const metadata = new CommitMetadata(
      new SemVer(CREAGEN_EDITOR_VERSION),
      libraries,
    )
    // store code and change url
    const commitResult = await this.vcs.commit(code, metadata)
    if (!commitResult.ok) {
      logger.error(commitResult.error)
      return null
    }

    const commit = commitResult.value
    if (commit !== null) {
      editorEvents.emit('vcs:commit', { commit, code })
      editorEvents.emit('vcs:checkout', { old, new: commit })
    }

    return { code, libraries }
  }

  /** Render current code with given libraries */
  async render() {
    const info = log(Severity.Info, 'rendering code', null)
    try {
      if (this.settings.values['editor.format_on_render'] != null) {
        await this.editor.format()
      }

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
    return this.vcs.import(data)
  }

  export() {
    return this.vcs.export()
  }
}
