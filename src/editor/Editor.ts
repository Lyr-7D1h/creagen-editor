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

export class Editor {
  private readonly editor: m.editor.IStandaloneCodeEditor
  private readonly autoimport: AutoImport
  private vimStatus: HTMLElement | null = document.getElementById('vim-status')
  private vimMode: m.editor.IStandaloneCodeEditor | null
  private fullscreendecorators: m.editor.IEditorDecorationsCollection | null
  private models: Record<string, monaco.editor.ITextModel> = {}

  static handleBeforeMount(monaco: Monaco) {
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

  constructor(editor: m.editor.IStandaloneCodeEditor, monaco: Monaco) {
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
  }

  html() {
    return this.editor.getDomNode()!
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

  setVimMode(value: boolean) {
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

  updateOptions(
    options: m.editor.IEditorOptions & m.editor.IGlobalEditorOptions,
  ) {
    this.editor.updateOptions(options)
  }

  clearTypings() {
    console.log('Editor: clearing typings')
    monaco.languages.typescript.typescriptDefaults.setExtraLibs([])
  }

  /** If `packageName` given will also add autoimports */
  addTypings(typings: string, uri: string, packageName?: string) {
    if (this.models[uri]) return
    console.log(`Editor: Adding typings for ${uri}`)
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

  /** force update current model */
  private forceUpdateModel() {
    const currentModel = this.editor.getModel()!
    monaco.editor.setModelLanguage(currentModel, 'typescript')
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

  hide() {
    if (this.vimStatus) this.vimStatus.style.display = 'none'
    this.html().style.display = 'none'
  }

  show() {
    if (this.vimStatus) this.vimStatus.style.display = 'block'
    this.html().style.display = 'block'
  }

  // setOpacity(opacity: number) {
  //   const h = Math.round(opacity).toString(16)
  //   const hex = h.length === 1 ? '0' + h : h

  //   monaco.editor.defineTheme('creagen', {
  //     ...creagenLightTheme,
  //     colors: {
  //       'editor.background': `#333333${hex}`,
  //     },
  //   })
  //   monaco.editor.setTheme('vs')
  //   monaco.editor.setTheme('creagen')
  // }

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
}
