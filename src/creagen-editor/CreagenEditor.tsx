import { Editor } from '../editor/Editor'
import { CREAGEN_EDITOR_VERSION } from '../env'
import { logger, Severity } from '../logs/logger'
import { Sandbox } from '../sandbox/Sandbox'
import { Settings } from '../settings/Settings'
import { CommitHash } from '../vcs/Commit'
import { LIBRARY_CONFIGS } from './libraryConfigs'
import { parseCode } from './parseCode'
import { Library } from '../settings/SettingsConfig'
import { CustomKeybinding, Keybindings } from './keybindings'
import { Importer, LibraryImport } from '../importer'
import { VCS } from '../vcs/VCS'
import { ClientStorage } from '../storage/ClientStorage'
import { editorEvents } from '../events/events'
import { Bookmark, isBookmark } from '../vcs/Bookmarks'
import { Command, COMMANDS } from './commands'

export class CreagenEditor {
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
    const sandbox = await new Sandbox()
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

    /// If head is set load corresponding code
    if (this.vcs.head) this.checkout(this.vcs.head.hash)

    // Load initial code and settings from url
    this.loadSettingsFromPath().catch(logger.error)
    this.loadLibraries()

    // Update code from history
    addEventListener('popstate', () => {
      this.vcs.updateFromUrl().then(() => {
        if (this.vcs.head) this.checkout(this.vcs.head.hash, false)
      })
    })

    editorEvents.on('settings:changed', ({ key: k, value }) => {
      if (k === 'editor.code_in_url') {
        this.vcs.updateUrl(this.editor.getValue())
      }

      if (k === 'general.libraries') {
        this.loadLibraries()
      }

      if (this.settings.isParam(k)) {
        if (this.settings.config[k].queryParam) {
          const url = new URL(window.location as any)
          if (value === null || url.searchParams.get(k) === value) return

          // remove query param if it is also the default behavior
          if (
            this.settings.defaultConfig[k].type === 'param' &&
            this.settings.defaultConfig[k].hidden === true &&
            this.settings.defaultConfig[k].value === value
          ) {
            url.searchParams.delete(k)
          } else {
            url.searchParams.set(k, value)
          }
          window.history.pushState(null, '', url)
        }
      }
    })
  }

  setStorage(storage: ClientStorage) {
    this.storage = storage
  }

  getLibraryImports() {
    return this.libraryImports
  }

  setLibraryImports(imports: Record<string, LibraryImport>) {
    this.libraryImports = imports
    return imports
  }

  async checkout(hash: CommitHash, updateHistory?: boolean): Promise<any>
  async checkout(bookmark: Bookmark, updateHistory?: boolean): Promise<any>
  async checkout(id: CommitHash | Bookmark, updateHistory?: boolean) {
    const checkout = await this.vcs.checkout(id, updateHistory)
    if (checkout === null) {
      logger.warn(`'${isBookmark(id) ? id.name : id.toSub()}' not found in vcs`)
      return
    }

    const {
      commit: { editorVersion, libraries },
      data,
    } = checkout
    if (editorVersion.compare(CREAGEN_EDITOR_VERSION)) {
      logger.warn("Editor version doesn't match")
    }
    this.settings.set('general.libraries', libraries)

    this.editor.setValue(data)
  }

  async loadSettingsFromPath() {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.forEach((value, key) => {
      if (this.settings.isParam(key)) {
        if (this.settings.config[key].queryParam) {
          const paramValue = this.settings.config[key].queryParam(value)
          this.settings.set(key, paramValue)
        }
      }
    })
  }

  loadLibraries() {
    const libraries = this.settings.values['general.libraries'] as Library[]
    this.editor.clearTypings()

    const updatedImports = libraries.map(({ name, version }) => {
      if (name in LIBRARY_CONFIGS) {
        const config = LIBRARY_CONFIGS[name]
        if (config?.template) {
          this.editor?.getValue() === '' &&
            this.editor.setValue(config.template)
        }
      }

      return new Promise<LibraryImport>((resolve, reject) => {
        if (
          this.libraryImports[name] &&
          this.libraryImports[name].version === version
        ) {
          return resolve(this.libraryImports[name])
        }

        Importer.getLibrary(name, version)
          .then((library) => {
            if (library === null) {
              reject(`Library ${name} not found`)
              return
            }

            library
              .typings()
              .then((typings) => {
                if (typings && this.editor) {
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

    Promise.allSettled(updatedImports)
      .then((results) => {
        const errors = results.filter((r) => r.status === 'rejected')
        if (errors.length > 0) errors.forEach((e) => logger.error(e.reason))

        const newImports = Object.fromEntries(
          results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => [r.value.name, r.value]),
        )

        this.setLibraryImports(newImports)
        return newImports
      })
      .catch(logger.error)
  }

  updateLibraries() {
    this.loadLibraries()

    if (this.vcs.head === null) return

    let code = this.editor.getValue()
    this.vcs.commit(code, this.settings.values['general.libraries'])
  }

  async render() {
    const info = logger.log(Severity.Info, 'rendering code', null)
    try {
      if (this.settings.values['editor.format_on_render']) {
        await this.editor.format()
      }

      let code = this.editor.getValue()

      // store code and change url
      this.vcs.commit(code, this.settings.values['general.libraries'])
      code = parseCode(code, this.libraryImports)

      const imports = Object.values(this.libraryImports).filter((lib) =>
        this.settings.values['general.libraries'].some(
          (library: Library) => library.name === lib.name,
        ),
      )

      this.sandbox?.render(code, imports)
    } catch (e) {
      logger.remove(info)
      throw e
    }
    logger.remove(info)
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
