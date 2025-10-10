import { localStorage } from '../storage/LocalStorage'
import AutoImport, { regexTokeniser } from '@kareemkermad/monaco-auto-import'
import { Monaco } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type * as m from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import './editor.css'

import { initVimMode } from 'monaco-vim'
import { Settings } from '../settings/Settings'
import { editorEvents } from '../events/events'
import { createContextLogger } from '../logs/logger'

// Use monaco without cdn: https://www.npmjs.com/package/@monaco-editor/react#loader-config
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

loader.config({ monaco })
loader.init()

// https://github.com/brijeshb42/monaco-themes/tree/master
const creagenLightTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  colors: {},
  rules: [],
}
const creagenFullscreenTheme: monaco.editor.IStandaloneThemeData = {
  base: 'hc-black',
  inherit: true,
  colors: {
    'editor.background': '#00000000',
    'editor.lineHighlightBackground': '#00000088',
    'editorCursor.foreground': '#ffffff',
  },
  rules: [],
}

export const typescriptCompilerOptions = {
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.Classic,
  esModuleInterop: true,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  noEmit: true,
}

export interface EditorSettings {
  value?: string
}

function handleBeforeMount(monaco: Monaco) {
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    // 1378,1375: allow await on top level
    diagnosticCodesToIgnore: [1375, 1378],
  })
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
    typescriptCompilerOptions,
  )
  monaco.editor.defineTheme('creagen', creagenLightTheme)
  monaco.editor.defineTheme('creagen-fullscreen', creagenFullscreenTheme)
}

const logger = createContextLogger('editor')
export class Editor {
  private readonly editor: m.editor.IStandaloneCodeEditor
  private readonly autoimport: AutoImport
  private vimMode: m.editor.IStandaloneCodeEditor | null
  private fullscreendecorators: m.editor.IEditorDecorationsCollection | null
  private models: Record<string, monaco.editor.ITextModel> = {}
  private _html
  private scrollSaveInterval: number | null = null
  private static readonly SCROLL_STORAGE_KEY = 'editor:scroll-position'
  private static readonly SCROLL_SAVE_INTERVAL_MS = 1000 // Save every second

  static async create(settings: Settings) {
    const monaco: Monaco = await loader.init()

    handleBeforeMount(monaco)

    const html = document.createElement('div')
    html.style.width = '100%'
    html.style.height = '100%'
    const editor = monaco.editor.create(html, {
      minimap: { enabled: false },
      tabSize: 2,
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
      automaticLayout: true,
      language: 'typescript',
      theme: 'creagen',
      scrollBeyondLastLine: false,
    })

    return new Editor(html, settings, monaco, editor)
  }

  constructor(
    html: HTMLElement,
    settings: Settings,
    monaco: Monaco,
    editor: m.editor.IStandaloneCodeEditor,
  ) {
    this._html = html
    this.editor = editor
    this.autoimport = new AutoImport({
      monaco,
      editor: this.editor,
      spacesBetweenBraces: true,
      doubleQuotes: true,
      semiColon: true,
      alwaysApply: false,
    })
    this.vimMode = null
    this.fullscreendecorators = null

    editorEvents.on('settings:changed', ({ key }) => {
      if (key.startsWith('editor')) this.updateFromSettings(settings)
    })
    this.updateFromSettings(settings)

    // Save scroll position when the page is about to unload
    const scrollPosition = localStorage.get('editor-scroll-position')
    if (scrollPosition) this.setScrollPosition(scrollPosition)
    window.addEventListener('beforeunload', () => {
      const position = this.editor.getScrollTop()
      localStorage.set('editor-scroll-position', position)
    })
  }

  updateFromSettings(settings: Settings) {
    const values = settings.values

    this.setRelativeLines(values['editor.relative_lines'])
    this.setFullscreenMode(values['editor.fullscreen'])
    this.setVimMode(values['editor.vim'])
  }

  html() {
    return this._html
  }

  layout(dimension?: monaco.editor.IDimension) {
    this.editor.layout(dimension)
  }

  async format() {
    await this.editor.getAction('editor.action.formatDocument')!.run()
  }

  /**
   * Adds a keybinding that works in both the editor and at the browser level
   * @param keybinding Monaco keybinding code
   * @param handler Function to call when the keybinding is triggered
   * @param preventDefault Whether to prevent default browser behavior (default: true)
   */
  addKeybind(keybinding: number, handler: (...args: any[]) => void) {
    // Register with Monaco editor
    this.editor.addCommand(keybinding, handler)
  }

  private setRelativeLines(value: boolean) {
    if (value) {
      this.editor.updateOptions({ lineNumbers: 'relative' })
    } else {
      this.editor.updateOptions({ lineNumbers: 'on' })
    }
  }

  private setVimMode(value: boolean) {
    if (value && this.vimMode === null) {
      this.vimMode = initVimMode(
        this.editor,
        document.getElementById('vim-status'),
      )
    } else if (!value && this.vimMode !== null) {
      this.vimMode.dispose()
      this.vimMode = null
    }
  }

  /** set background transparent and make code highly visable */
  setFullscreenMode(value: boolean) {
    if (value) {
      monaco.editor.setTheme('creagen-fullscreen')
      const value = this.getValue()
      this.fullscreendecorators = this.editor.createDecorationsCollection([
        {
          range: new monaco.Range(0, 0, value.length + 1, 0),
          options: {
            inlineClassName: 'creagen-fullscreen',
          },
        },
      ])
    } else {
      if (this.fullscreendecorators) this.fullscreendecorators.clear()
      this.fullscreendecorators = null
      monaco.editor.setTheme('creagen')
    }
  }

  clearTypings() {
    logger.info('clearing typings')
    monaco.languages.typescript.typescriptDefaults.setExtraLibs([])
  }

  /** If `packageName` given will also add autoimports */
  addTypings(typings: string, uri: string, packageName?: string) {
    if (this.models[uri]) return
    logger.info(`Adding typings for ${uri}`)
    // monaco.languages.typescript.javascriptDefaults.addExtraLib(typings, uri)
    if (typeof packageName === 'string') {
      this.autoimport.imports.saveFile({
        path: packageName,
        aliases: [packageName],
        imports: regexTokeniser(typings),
      })
    }
    monaco.languages.typescript.typescriptDefaults.addExtraLib(typings, uri)
  }

  getValue() {
    return this.editor.getValue()
  }

  setValue(value: string) {
    this.editor.setValue(value)

    if (this.fullscreendecorators) {
      this.fullscreendecorators.clear()
      this.fullscreendecorators = this.editor.createDecorationsCollection([
        {
          range: new monaco.Range(0, 0, value.length + 1, 0),
          options: {
            inlineClassName: 'creagen-fullscreen',
          },
        },
      ])
    }
  }

  /**
   * Set the scroll position of the editor
   * @param scrollTop Vertical scroll position in pixels
   * @param scrollLeft Horizontal scroll position in pixels (optional, default: current position)
   */
  setScrollPosition(scrollTop: number, scrollLeft?: number) {
    this.editor.setScrollPosition({
      scrollTop,
      scrollLeft: scrollLeft ?? this.editor.getScrollLeft(),
    })
  }
}
