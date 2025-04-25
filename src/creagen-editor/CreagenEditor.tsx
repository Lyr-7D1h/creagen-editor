import * as monaco from 'monaco-editor'
import { Settings } from '../settings/Settings'
import React, { useState, useRef, useEffect } from 'react'
import { VerticalSplitResizer } from './VerticalSplitResizer'
import { Editor } from './editor/Editor'
import { EditorView } from './editor/EditorView'
import { CREAGEN_EDITOR_VERSION } from '../env'
import { logger } from '../logs/logger'
import { Logs } from '../logs/Logs'
import { Sandbox, AnalyzeContainerResult } from './sandbox/Sandbox'
import { SandboxView } from './sandbox/SandboxView'
import {
  useSettings,
  Library,
  SettingsContextType,
} from '../settings/SettingsProvider'
import { useStorage } from '../storage/StorageProvider'
import { IDFromString, IDToString, ID, createID } from './id'
import { LibraryImport, Importer } from './importer'
import { LIBRARY_CONFIGS } from './libraryConfigs'
import { parseCode } from './parseCode'
import { Svg } from './svg'
import { Storage } from '../storage/storage'

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

export function CreagenEditor() {
  const storage = useStorage()
  const settings = useSettings()
  const [activeId, setActiveIdState] = useState<ID | null>(null)
  const editorRef = useRef<Editor>(null)
  const sandboxRef = useRef<Sandbox>(null)
  const [loaded, setLoaded] = useState(false)
  const [libraryImports, setLibraryImports] = useState<
    Record<string, LibraryImport>
  >({})

  /** Add new id to history */
  function updateActiveId(id: ID) {
    if (JSON.stringify(id) === JSON.stringify(activeId)) return
    window.history.pushState('Creagen', '', IDToString(id))
    setActiveIdState(id)
  }

  function loadLibraries() {
    if (editorRef.current === null) return
    const editor = editorRef.current!

    const libraries = settings.values['general.libraries'] as Library[]
    editor.clearTypings()
    const updatedImports = libraries.map(({ name, version }) => {
      if (name in LIBRARY_CONFIGS) {
        const config = LIBRARY_CONFIGS[name]
        if (config?.template) {
          editor.getValue() === '' && editor.setValue(config.template)
        }
      }

      return new Promise<LibraryImport>((resolve, reject) => {
        if (libraryImports[name] && libraryImports[name].version === version) {
          return resolve(libraryImports[name])
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
                if (typings) {
                  editor.addTypings(
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

        setLibraryImports(
          Object.fromEntries(
            results
              .filter((r) => r.status === 'fulfilled')
              .map((r) => [r.value.name, r.value]),
          ),
        )
      })
      .catch(logger.error)
  }

  /** initial load */
  function load() {
    if (editorRef.current === null) return
    if (loaded) return
    setLoaded(true)

    const editor = editorRef.current

    setupKeybinds(editor)

    // load initial code
    loadCodeFromPath(storage)
      .then((res) => {
        if (res !== null) {
          const { id, code } = res
          if (id.editorVersion.compare(CREAGEN_EDITOR_VERSION))
            logger.warn("Editor version doesn't match")
          settings.set('general.libraries', id.libraries)
          setActiveIdState(id)
          editor.setValue(code)
        }
      })
      .catch(logger.error)

    loadLibraries()
  }

  // update storage used estimate
  useEffect(() => {
    navigator.storage
      .estimate()
      .then((storage) =>
        settings.set('general.storage', {
          current: storage.usage ?? 0,
          max: storage.quota ?? 1,
        }),
      )
      .catch(logger.error)
  }, [])

  useEffect(() => {
    loadLibraries()
    if (activeId !== null) {
      const { hash, editorVersion, date } = activeId
      updateActiveId({
        hash,
        editorVersion,
        date,
        libraries: settings.values['general.libraries'],
      })
    }
  }, [settings.values['general.libraries']])

  addEventListener('popstate', () => {
    loadCodeFromPath(storage).catch(logger.error)
  })

  async function render(
    settings: SettingsContextType,
    libraryImports: Record<string, LibraryImport>,
  ) {
    if (editorRef.current === null) return
    const editor = editorRef.current

    logger.clear()
    const info = logger.info('rendering code')
    if (settings.values['editor.format_on_render']) {
      await editor.format()
    }

    let code = editor.getValue()

    // store code and change url
    const id = await createID(code, settings.values['general.libraries'])
    // store and add to history if not new
    if (id.hash !== activeId?.hash) {
      await storage.set(id, {
        code,
        createdOn: id.date,
        previous: activeId ?? undefined,
      })
      if (id.hash !== activeId?.hash) {
        // FIXME: activeId should not be undefined
        updateActiveId(id)
      }
    }

    code = parseCode(code, libraryImports)

    const imports = Object.values(libraryImports).filter((lib) =>
      settings.values['general.libraries'].some(
        (library: Library) => library.name === lib.name,
      ),
    )
    sandboxRef.current?.render(code, imports)

    logger.remove(info)
  }

  function setupKeybinds(editor: Editor) {
    editor.addKeybind(
      monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        render(settings, libraryImports)
      },
    )
  }
  // ensure that keybinds are always dealing with latest settings
  useEffect(() => {
    if (editorRef.current === null) return
    setupKeybinds(editorRef.current!)
  }, [settings.values, libraryImports])

  return (
    <>
      <Logs />
      <VerticalSplitResizer>
        <EditorView
          height={'100vh'}
          onLoad={(editor) => {
            editorRef.current = editor
            load()
          }}
        />
        <SandboxView
          onLoad={(sandbox) => {
            sandboxRef.current = sandbox
            sandbox.addEventListener('analysisResult', (result) => {
              updateRenderSettings(settings, result.analysisResult, sandbox)
            })
          }}
        />
      </VerticalSplitResizer>
      <Settings />
    </>
  )
}

async function updateRenderSettings(
  settings: SettingsContextType,
  result: AnalyzeContainerResult,
  link: Sandbox,
) {
  settings.remove('export')
  for (const svgResult of result.svgs) {
    const { paths, circles, rects } = svgResult
    settings.add('export', {
      type: 'folder',
      title: 'Export',
    })
    settings.add('export.paths', {
      type: 'param',
      label: 'Paths',
      value: paths,
      opts: {
        readonly: true,
      },
    })
    settings.add('export.circles', {
      type: 'param',
      label: 'Circles',
      value: circles,
      opts: {
        readonly: true,
      },
    })
    settings.add('export.rects', {
      type: 'param',
      label: 'Rects',
      value: rects,
      opts: {
        readonly: true,
      },
    })
    settings.add('export.name', {
      type: 'param',
      label: 'Name',
      value: settings.values['general.name'],
      opts: {
        readonly: true,
      },
    })
    settings.add('export.optimize', {
      type: 'param',
      label: 'Optimize',
      value: true,
      opts: {
        readonly: true,
      },
    })
    settings.add('export.download', {
      type: 'button',
      title: 'Download',
      onClick: async () => {
        const svgString = await link.svgExport(0)
        if (svgString === null) {
          logger.error('No svg found')
          return
        }
        const parser = new DOMParser()
        const doc = parser.parseFromString(svgString, 'image/svg+xml')
        const svgInstance = new Svg(
          doc.documentElement as unknown as SVGElement,
        )
        svgInstance.export(
          settings.values['general.name'],
          settings.values['general.libraries'],
        )
        console.log(svgString)
      },
    })
  }
}
