import React, { useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import { Messages } from './components/Messages'
import { EditorView, typescriptCompilerOptions } from './components/Editor'
import { SandboxView } from './components/Sandbox'
import { useStorage } from './StorageProvider'
import { Settings } from './components/Settings'
import { useSettings } from './SettingsProvider'
import { VerticalSplitResizer } from './components/VerticalSplitResizer'
import { createID, ID, IDFromString, IDToString } from './id'
import { Importer, LibraryImport } from './importer'
import log from './log'
import ts from 'typescript'
import { Storage } from './storage'
import { Editor } from './components/Editor/editor'
import { AnalyzeContainerResult, Sandbox } from './components/Sandbox/sandbox'
import { GENART_EDITOR_VERSION, GENART_VERSION } from './env'
import { TYPESCRIPT_IMPORT_REGEX } from './constants'

/** Get code id from path and load code from indexdb */
async function loadCodeFromPath(storage: Storage) {
  const path = window.location.pathname.replace('/', '')

  if (path.length === 0) return null

  const id = IDFromString(path)

  if (id === null) {
    log.error('invalid id given')
    return null
  }
  const value = await storage.get(id)
  if (value === null) {
    log.warn(`${IDToString(id)} not found in storage`)
    return null
  }

  return { id, code: value.code }
}

export function App() {
  const storage = useStorage()
  const settings = useSettings()
  const [activeId, setActiveId] = useState<ID | null>(null)
  const editorRef = useRef<Editor>(null)
  const sandboxRef = useRef<Sandbox>(null)
  const [loaded, setLoaded] = useState(false)
  const libraries = useRef<LibraryImport[]>([])

  function loadLibraries() {
    if (editorRef.current === null || sandboxRef.current === null) return
    const editor = editorRef.current!
    const sandbox = sandboxRef.current!

    // sandbox.clearLibraries()
    for (const { name, version } of settings.values['general.libraries']) {
      Importer.getLibrary(name, version).then((library) => {
        if (library === null) {
          log.warn(`Library ${name} not found`)
          return
        }

        sandbox.addLibrary(library)

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
            libraries.current.push(library)
          })
          .catch(log.error)
      })
    }
  }

  /** initial load */
  function load() {
    if (editorRef.current === null || sandboxRef.current === null) return
    if (loaded) return
    setLoaded(true)

    const editor = editorRef.current
    const sandbox = sandboxRef.current

    editor.addTypings(sandbox.globalTypings(), 'ts:sandbox.d.ts')
    editor.addKeybind(
      monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        render()
      },
    )

    // load initial code
    loadCodeFromPath(storage)
      .then((res) => {
        if (res !== null) {
          const { id, code } = res
          if (id.editorVersion !== GENART_EDITOR_VERSION)
            log.warn("Editor version doesn't match")
          settings.set('general.libraries', id.libs)
          setActiveId(id)
          editor.setValue(code)
        }
      })
      .catch(log.error)

    loadLibraries()
  }

  // update storage used estimate
  useEffect(() => {
    navigator.storage
      .estimate()
      .then((storage) =>
        settings.set(
          'general.storage',
          (storage.usage ?? 0) / (storage.quota ?? 1),
        ),
      )
      .catch(log.error)
  }, [])

  useEffect(() => {
    loadLibraries()
    if (activeId !== null) {
      const { hash, editorVersion, date } = activeId
      setActiveId({
        hash,
        editorVersion,
        date,
        libs: settings.values['general.libraries'],
      })
    }
  }, [settings.values['general.libraries']])

  addEventListener('popstate', () => {
    loadCodeFromPath(storage).catch(log.error)
  })

  async function render() {
    if (editorRef.current === null || sandboxRef.current === null) return
    const editor = editorRef.current
    const sandbox = sandboxRef.current

    log.clear()
    const info = log.info('rendering code')
    if (settings.values['editor.format_on_render']) {
      await editor.format()
    }

    let code = editor.getValue()

    // store code and change url
    const id = await createID(code, libraries.current)
    await storage.set(id, {
      code,
      createdOn: id.date,
      previous: activeId ?? undefined,
    })
    if (id.hash !== activeId?.hash) {
      window.history.pushState('Genart', '', IDToString(id))
      setActiveId(id)
    }

    code = parseCode(code, libraries.current)

    sandbox.runScript(code, () => {
      const result = sandbox.analyzeContainer()
      updateRenderSettings(result)
      console.log('loaded')
    })

    info.remove()
  }

  async function updateRenderSettings(result: AnalyzeContainerResult) {
    for (const svgResult of result.svgs) {
      const { paths, circles, rects, svg } = svgResult
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
        onClick: () => {
          exportSvg(svg, {
            optimize: true,
            name: settings.values['general.name'],
          })
        },
      })
    }
  }

  return (
    <>
      <Messages />
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
            load()
          }}
        />
      </VerticalSplitResizer>
      <Settings />
    </>
  )
}

/** Parse code to make it compatible for the editor */
function parseCode(code: string, libraries: LibraryImport[]) {
  code = resolveImports(code, libraries)
  console.log(libraries)
  if (libraries.find((l) => l.name === 'p5')) code = makeP5FunctionsGlobal(code)

  return ts.transpile(code, typescriptCompilerOptions)
}

function resolveImports(code: string, libraries: LibraryImport[]) {
  let match
  while ((match = TYPESCRIPT_IMPORT_REGEX.exec(code)) !== null) {
    const imports = match.groups!['imports']
    const module = match.groups!['module']
    if (typeof module === 'undefined') continue

    // Replace the module path while leaving the imports intact
    const newModulePath = libraries.find((l) => l.name === module)?.importPath
    if (typeof newModulePath === 'undefined') {
      log.error(`Library ${module} not found`)
      continue
    }
    const updatedImport = imports
      ? `import ${imports} from '${newModulePath}';`
      : `import '${newModulePath}';`

    code = code.replace(match[0], updatedImport)
  }
  return code
}

function makeP5FunctionsGlobal(code: string) {
  // globally defined functions
  const userDefinedFunctions = [
    'setup',
    'draw',
    'mousePressed',
    'mouseReleased',
    'mouseClicked',
    'mouseMoved',
    'mouseDragged',
    'mouseWheel',
    'keyPressed',
    'keyReleased',
    'keyTyped',
    'touchStarted',
    'touchMoved',
    'touchEnded',
    'windowResized',
    'preload',
    'remove',
    'deviceMoved',
    'deviceTurned',
    'deviceShaken',
  ]

  const functionRegex = new RegExp(
    `\\b(${userDefinedFunctions.join('|')})\\b\\s*\\(`,
    'g',
  )

  // Find all matches of the defined functions
  let matches
  const definedFunctions = new Set()
  while ((matches = functionRegex.exec(code)) !== null) {
    definedFunctions.add(matches[1])
  }

  // Append window.{functionName} = {functionName} for each detected function
  const globalCode = Array.from(definedFunctions)
    .map((fn) => `window.${fn} = ${fn};`)
    .join('\n')

  // Add the global code to the original code
  return code + '\n\n' + globalCode
}

function exportSvg(svg: SVGElement, opts: { optimize: boolean; name: string }) {
  svg = svg.cloneNode(true) as SVGElement

  if (opts.optimize) {
    optimizeSvg(svg)
  }

  // TODO: add params used, code hash, date generated
  const metadata = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'metadata',
  )
  const genart = document.createElement('genart')
  genart.setAttribute('version', GENART_VERSION)
  genart.setAttribute('editor-version', GENART_EDITOR_VERSION)
  metadata.appendChild(genart)
  svg.appendChild(metadata)

  const htmlStr = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${svg.outerHTML}`
  const blob = new Blob([htmlStr], { type: 'image/svg+xml' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('download', `${opts.name}.svg`)
  a.setAttribute('href', url)
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function optimizeSvg(html: Element) {
  for (const c of Array.from(html.children)) {
    switch (c.tagName.toLocaleLowerCase()) {
      case 'path':
        // TODO: fix for http://localhost:5173/af438744df3a711f006203aaa39cd24e157f0f16f59ddfd6c93ea8ba00624032302e302e313a313733363532363839323337353a5b2267656e61727440302e302e35225d
        // if (optimizePath(c as SVGPathElement, opts)) {
        //   c.remove()
        // }
        break
      case 'circle':
        break
      case 'rect':
        break
    }

    optimizeSvg(c)
  }
}
