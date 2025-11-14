import { Editor } from '../editor/Editor'
import { logger, Severity } from '../logs/logger'
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
import { VCS } from '../vcs/VCS'
import { ClientStorage } from '../storage/ClientStorage'
import { editorEvents } from '../events/events'
import { Bookmark, isBookmark } from '../vcs/Bookmarks'
import { Command, COMMANDS } from './commands'
import { SemVer } from 'semver'
import { ResourceMonitor } from '../resource-monitor/ResourceMonitor'
import { Params } from '../params/Params'

export class CreagenEditor {
  resourceMonitor = new ResourceMonitor()
  params: Params
  storage: ClientStorage
  settings: Settings
  editor: Editor
  sandbox: Sandbox
  vcs: VCS
  keybindings: Keybindings

  // private commands: Map<string, (editor: CreagenEditor) => void> = new Map()
  private libraryImports: Record<string, LibraryImport> = {}

  static async create() {
    const storage = await ClientStorage.create()
    const settings = await Settings.create(storage)
    const editor = await Editor.create(settings)
    const sandbox = Sandbox.create()
    const vcs = await VCS.create(storage, settings)
    await vcs.updateFromUrl()
    const customKeybindings = (await storage.get('custom-keybindings')) ?? []

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
    vcs: VCS,
    customKeybindings: CustomKeybinding[],
  ) {
    this.sandbox = sandbox
    this.editor = editor
    this.settings = settings
    this.storage = storage
    this.vcs = vcs
    this.keybindings = new Keybindings(customKeybindings, this)
    this.params = new Params()

    this.loadFromQueryParams()
    /// If head is set load corresponding code
    if (this.vcs.head) {
      this.checkout(this.vcs.head.hash)
        .then(() => {
          return this.loadLibraries()
        })
        .then(() => {
          if (this.settings.get('editor.init_render')) {
            this.render().catch(logger.error)
          } else if (this.settings.get('params.auto_render')) {
            const code = this.editor.getValue()
            this.parseCode(code)
          }
        })
        .catch(logger.error)
    }

    if (this.settings.get('sandbox.resource_monitor'))
      this.resourceMonitor.listen()

    // Setup listener for updating code from history
    window.addEventListener('popstate', () => {
      this.vcs
        .updateFromUrl()
        .then(() => {
          if (this.vcs.head)
            this.checkout(this.vcs.head.hash, false).catch(logger.error)
        })
        .catch(logger.error)
    })

    // Listen to setting changes
    editorEvents.on('settings:changed', ({ key, value }) => {
      if (key === 'editor.code_in_url') {
        this.vcs.updateUrl(this.editor.getValue())
        return
      }

      if (key === 'libraries') {
        this.loadLibraries().catch(logger.error)
        return
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
          const url = new URL(window.location.href)
          if (value === null || url.searchParams.get(key) === value) return

          // remove query param if it is also the default behavior
          if ((DEFAULT_SETTINGS_CONFIG[key] as SettingsParam).value === value) {
            url.searchParams.delete(key)
          } else {
            const v = JSON.stringify(value)
            url.searchParams.set(key, v)
          }
          window.history.replaceState(null, '', url)
        }
      }
    })
  }

  /** Create new sketch */
  async new(hash?: CommitHash) {
    await this.vcs.new(hash)
    this.editor.setValue('')
  }

  async checkout(hash: CommitHash, updateUrlHistory?: boolean): Promise<void>
  async checkout(bookmark: Bookmark, updateUrlHistory?: boolean): Promise<void>
  async checkout(id: CommitHash | Bookmark, updateUrlHistory?: boolean) {
    const checkout = await this.vcs.checkout(id, updateUrlHistory)
    if (checkout === null) {
      logger.warn(`'${isBookmark(id) ? id.name : id.toSub()}' not found in vcs`)
      return
    }

    const {
      commit: { editorVersion, libraries },
      data,
    } = checkout
    if (editorVersion.compare(new SemVer(CREAGEN_EDITOR_VERSION)) !== 0) {
      logger.warn("Editor version doesn't match")
    }
    this.settings.set('libraries', libraries)

    this.editor.setValue(data)
  }

  /** Update settings from query params */
  loadFromQueryParams() {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.forEach((value, key) => {
      if (this.settings.isParam(key)) {
        if (this.settings.config[key].fromQueryParam) {
          const paramValue = this.settings.config[key].fromQueryParam(value)
          this.settings.set(key, paramValue)
        }
      }
    })
  }

  async loadLibraries() {
    logger.debug('Loading libraries')
    const libraries = this.settings.values['libraries'] as Library[]
    this.editor.clearTypings()
    this.editor.addTypings(Params.TYPINGS, 'creagen-editor')

    const updatedImports = libraries.map(({ name, version }) => {
      if (name in LIBRARY_CONFIGS) {
        const config = LIBRARY_CONFIGS[name]
        if (config?.template != null) {
          if (this.editor.getValue() === '')
            this.editor.setValue(config.template)
        }
      }

      return new Promise<LibraryImport>((resolve, reject) => {
        if (this.libraryImports[name]?.version === version) {
          return resolve(this.libraryImports[name])
        }

        Importer.getLibrary(name, version)
          .then((library) => {
            logger.trace('loading ', library)
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

            resolve(library)
          })
          .catch(reject)
      })
    })

    return Promise.allSettled(updatedImports).then((results) => {
      const errors = results.filter((r) => r.status === 'rejected')
      if (errors.length > 0) errors.forEach((e) => logger.error(e.reason))

      const newImports = Object.fromEntries(
        results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => [r.value.name, r.value]),
      )

      this.libraryImports = newImports
    })
  }

  parseCode(code: string) {
    // eslint-disable-next-line no-param-reassign
    code = parseCode(code, this.libraryImports, this.params)
    this.params.save()
    editorEvents.emit('params:update', undefined)
    return code
  }

  async render() {
    const libraries = this.settings.values['libraries'] as Library[]
    const info = logger.log(Severity.Info, 'rendering code', null)
    try {
      if (this.settings.values['editor.format_on_render'] != null) {
        await this.editor.format()
      }

      let code = this.editor.getValue()
      if (code.length === 0) return

      // store code and change url
      this.vcs.commit(code, libraries).catch(logger.error)
      code = this.parseCode(code)

      const imports = Object.values(this.libraryImports).filter((lib) =>
        libraries.some((library: Library) => library.name === lib.name),
      )

      await this.sandbox.render(code, imports)
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
}
