import { Editor } from '../editor/Editor'
import { CREAGEN_EDITOR_VERSION } from '../env'
import { logger, Severity } from '../logs/logger'
import { Sandbox } from '../sandbox/Sandbox'
import { Settings } from '../settings/Settings'
import { ID } from './id'
import { LIBRARY_CONFIGS } from './libraryConfigs'
import { parseCode } from './parseCode'
import { IndexDB, Storage } from '../storage/storage'
import { Library } from '../settings/SettingsConfig'
import { Keybindings } from './keybindings'
import { Importer, LibraryImport } from '../importer'

/** Get code id from path and load code from indexdb */
async function loadCodeFromPath(storage: Storage) {
  const params = new URLSearchParams(window.location.search)

  const path = window.location.pathname.replace('/', '')

  if (path.length === 0) return null

  const id = ID.fromString(path)

  if (id === null) {
    logger.error('invalid id given')
    return null
  }
  const value = await storage.get(id)
  if (value === null) {
    logger.warn(`${id.toSub()} not found in storage`)
    return null
  }

  return { id, code: value.code, params }
}

export class CreagenEditor {
  editor: Editor | null = null
  storage: Storage = new IndexDB()
  settings: Settings = new Settings()
  sandbox: Sandbox | null = null
  keybindings = new Keybindings()

  private activeId: ID | null = null
  // private commands: Map<string, (editor: CreagenEditor) => void> = new Map()
  private libraryImports: Record<string, LibraryImport> = {}
  private loaded = false

  constructor() {
    // Handle popstate event
    addEventListener('popstate', () => {
      this.loadFromPath().catch(logger.error)
    })
  }

  load() {
    if (!this.editor) return
    if (this.loaded) return
    this.loaded = true

    this.setupKeybindings()

    // Load initial code and settings from url
    this.loadFromPath().catch(logger.error)
    this.loadLibraries()

    this.settings.subscribe((value, k) => {
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
          history.pushState(null, '', url)
        }
      }
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
    window.history.pushState('Creagen', '', id.toString())
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

  setupKeybindings() {
    if (!this.editor) return

    this.keybindings.setupKeybindings(this)
  }

  async loadFromPath() {
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

    const urlParams = new URLSearchParams(window.location.search)
    for (const [key, value] of urlParams.entries()) {
      if (this.settings.isParam(key)) {
        if (this.settings.config[key].queryParam) {
          const paramValue = this.settings.config[key].queryParam(value)
          this.settings.set(key, paramValue)
        }
      }
    }
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

  updateLibraries() {
    this.loadLibraries()
    if (this.activeId !== null) {
      const { hash, editorVersion } = this.activeId
      this.updateActiveId(
        new ID(hash, editorVersion, this.settings.values['general.libraries']),
      )
    }
  }

  async render() {
    if (!this.editor) return

    const info = logger.log(Severity.Info, 'rendering code', null)
    try {
      if (this.settings.values['editor.format_on_render']) {
        await this.editor.format()
      }

      let code = this.editor.getValue()

      // store code and change url
      const id = await ID.create(
        code,
        this.settings.values['general.libraries'],
      )
      // store and add to history if not new
      if (id.hash !== this.activeId?.hash) {
        await this.storage.set(id, {
          code,
          createdOn: new Date(),
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
    } catch (e) {
      logger.remove(info)
      throw e
    }
    logger.remove(info)
  }
}
