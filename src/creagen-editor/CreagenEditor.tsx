import { Editor } from './editor/Editor'
import { CREAGEN_EDITOR_VERSION } from '../env'
import { logger } from '../logs/logger'
import { Sandbox } from './sandbox/Sandbox'
import { Library, Settings } from '../settings/Settings'
import { IDFromString, IDToString, ID, createID } from './id'
import { LibraryImport, Importer } from './importer'
import { LIBRARY_CONFIGS } from './libraryConfigs'
import { parseCode } from './parseCode'
import { IndexDB, Storage } from '../storage/storage'
import {
  getMonacoKeybinding,
  KEYBINDINGS,
  monacoKeyToBrowserKey,
} from './keybindings'
import { COMMANDS } from './commands'

/** Get code id from path and load code from indexdb */
async function loadCodeFromPath(storage: Storage) {
  const path = window.location.pathname.replace('/', '')

  if (path.length === 0) return null

  const id = IDFromString(path)

  if (id === null) {
    logger.error('invalid id given')
    return null
  }
  const value = await storage.get(id)
  if (value === null) {
    logger.warn(`${IDToString(id)} not found in storage`)
    return null
  }

  return { id, code: value.code }
}

export class CreagenEditor {
  editor: Editor | null = null
  storage: Storage = new IndexDB()
  settings: Settings = new Settings()
  sandbox: Sandbox | null = null

  private activeId: ID | null = null
  // private commands: Map<string, (editor: CreagenEditor) => void> = new Map()
  private libraryImports: Record<string, LibraryImport> = {}
  private loaded = false
  private keybindings: Map<string, (e: KeyboardEvent) => void> = new Map()

  constructor() {
    // Handle popstate event
    addEventListener('popstate', () => {
      this.loadCodeFromPath().catch(logger.error)
    })
  }

  setEditor(editor: Editor | null) {
    this.editor = editor
    if (editor && !this.loaded) {
      this.load()
    }
  }

  setSandbox(sandbox: Sandbox | null) {
    this.sandbox = sandbox
  }

  setStorage(storage: Storage) {
    this.storage = storage
  }

  setActiveId(id: ID | null) {
    this.activeId = id
    return id
  }

  updateActiveId(id: ID) {
    if (JSON.stringify(id) === JSON.stringify(this.activeId)) return
    window.history.pushState('Creagen', '', IDToString(id))
    return this.setActiveId(id)
  }

  getLibraryImports() {
    return this.libraryImports
  }

  setLibraryImports(imports: Record<string, LibraryImport>) {
    this.libraryImports = imports
    return imports
  }

  updateStorageUsage() {
    navigator.storage
      .estimate()
      .then((storage) =>
        this.settings.set('general.storage', {
          current: storage.usage ?? 0,
          max: storage.quota ?? 1,
        }),
      )
      .catch(logger.error)
  }

  private addKeybind(
    keybind: string,
    handler: (...args: any[]) => void,
    preventDefault: boolean = true,
  ) {
    if (!this.editor) return

    const monacoKeybinding = getMonacoKeybinding(keybind)
    this.editor.addKeybind(monacoKeybinding, handler)

    const keyInfo = monacoKeyToBrowserKey(monacoKeybinding)
    if (!keyInfo) return

    // Create browser-level handler
    const browserHandler = (e: KeyboardEvent) => {
      if (
        keyInfo.ctrlKey === e.ctrlKey &&
        keyInfo.altKey === e.altKey &&
        keyInfo.shiftKey === e.shiftKey &&
        keyInfo.metaKey === e.metaKey &&
        keyInfo.key.toLowerCase() === e.key.toLowerCase()
      ) {
        if (preventDefault) e.preventDefault()
        handler()
      }
    }

    // Store reference to handler for potential cleanup
    this.keybindings.set(keybind, browserHandler)

    // Register browser-level listener
    document.addEventListener('keydown', browserHandler)
  }

  /**
   * Removes a previously registered keybinding
   * @param keybinding Monaco keybinding code
   */
  private removeKeybind(keybind: string) {
    const browserHandler = this.keybindings.get(keybind)
    if (browserHandler) {
      document.removeEventListener('keydown', browserHandler)
      this.keybindings.delete(keybind)
    }
  }

  setupKeybindings() {
    if (!this.editor) return

    for (const keybind of KEYBINDINGS) {
      const command = COMMANDS[keybind.command]
      if (typeof command == 'undefined')
        throw new Error(`Command ${keybind.command} not found`)
      this.addKeybind(keybind.key, () => command(this))
    }
  }

  async loadCodeFromPath() {
    const result = await loadCodeFromPath(this.storage)
    if (result !== null && this.editor) {
      const { id, code } = result
      if (id.editorVersion.compare(CREAGEN_EDITOR_VERSION)) {
        logger.warn("Editor version doesn't match")
      }
      this.settings.set('general.libraries', id.libraries)
      this.setActiveId(id)
      this.editor.setValue(code)
    }
    return result
  }

  loadLibraries() {
    if (!this.editor) return

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

  load() {
    if (!this.editor) return
    if (this.loaded) return
    this.loaded = true

    this.setupKeybindings()

    // Load initial code
    this.loadCodeFromPath().catch(logger.error)
    this.loadLibraries()

    this.settings.subscribe(() => {
      this.updateLibraries()
    }, 'general.libraries')
  }

  updateLibraries() {
    this.loadLibraries()
    if (this.activeId !== null) {
      const { hash, editorVersion, date } = this.activeId
      this.updateActiveId({
        hash,
        editorVersion,
        date,
        libraries: this.settings.values['general.libraries'],
      })
    }
  }

  async render() {
    if (!this.editor) return

    logger.clear()
    const info = logger.info('rendering code')
    if (this.settings.values['editor.format_on_render']) {
      await this.editor.format()
    }

    let code = this.editor.getValue()

    // store code and change url
    const id = await createID(code, this.settings.values['general.libraries'])
    // store and add to history if not new
    if (id.hash !== this.activeId?.hash) {
      await this.storage.set(id, {
        code,
        createdOn: id.date,
        previous: this.activeId ?? undefined,
      })
      if (id.hash !== this.activeId?.hash) {
        this.updateActiveId(id)
      }
    }

    code = parseCode(code, this.libraryImports)

    const imports = Object.values(this.libraryImports).filter((lib) =>
      this.settings.values['general.libraries'].some(
        (library: Library) => library.name === lib.name,
      ),
    )

    this.sandbox?.render(code, imports)
    logger.remove(info)
  }
}
