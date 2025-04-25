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
    'editor.background': '#ffffff00',
    'editor.selectionBackground': '#ffffff',
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
  private vimMode: m.editor.IStandaloneCodeEditor | null
  private fullscreendecorators: m.editor.IEditorDecorationsCollection | null
  private models: Record<string, monaco.editor.ITextModel> = {}
  private browserKeybindings: Map<number, (e: KeyboardEvent) => void> =
    new Map()

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

  async format() {
    await this.editor.getAction('editor.action.formatDocument')!.run()
  }

  /**
   * Adds a keybinding that works in both the editor and at the browser level
   * @param keybinding Monaco keybinding code
   * @param handler Function to call when the keybinding is triggered
   * @param preventDefault Whether to prevent default browser behavior (default: true)
   */
  addKeybind(
    keybinding: number,
    handler: (...args: any[]) => void,
    preventDefault: boolean = true,
  ) {
    // Register with Monaco editor
    this.editor.addCommand(keybinding, handler)

    // Convert Monaco keybinding to browser KeyboardEvent parameters
    const keyInfo = this.monacoKeyToBrowserKey(keybinding)
    if (!keyInfo) return

    // Create browser-level handler
    const browserHandler = (e: KeyboardEvent) => {
      // Only trigger when editor doesn't have focus
      if (document.activeElement === this.editor.getDomNode()) return

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
    this.browserKeybindings.set(keybinding, browserHandler)

    // Register browser-level listener
    document.addEventListener('keydown', browserHandler)
  }

  /**
   * Removes a previously registered keybinding
   * @param keybinding Monaco keybinding code
   */
  removeKeybind(keybinding: number) {
    const browserHandler = this.browserKeybindings.get(keybinding)
    if (browserHandler) {
      document.removeEventListener('keydown', browserHandler)
      this.browserKeybindings.delete(keybinding)
    }
  }

  /**
   * Cleans up all registered browser-level keybindings
   */
  disposeKeybindings() {
    this.browserKeybindings.forEach((handler, _) => {
      document.removeEventListener('keydown', handler)
    })
    this.browserKeybindings.clear()
  }

  /**
   * Converts a Monaco keybinding code to browser KeyboardEvent parameters
   */
  private monacoKeyToBrowserKey(keybinding: number): {
    ctrlKey: boolean
    altKey: boolean
    shiftKey: boolean
    metaKey: boolean
    key: string
  } | null {
    const KEY_CODE_MAP: Record<number, string> = {
      // Letters
      31: 'a',
      32: 'b',
      33: 'c',
      34: 'd',
      35: 'e',
      36: 'f',
      37: 'g',
      38: 'h',
      39: 'i',
      40: 'j',
      41: 'k',
      42: 'l',
      43: 'm',
      44: 'n',
      45: 'o',
      46: 'p',
      47: 'q',
      48: 'r',
      49: 's',
      50: 't',
      51: 'u',
      52: 'v',
      53: 'w',
      54: 'x',
      55: 'y',
      56: 'z',

      // Numbers
      21: '0',
      22: '1',
      23: '2',
      24: '3',
      25: '4',
      26: '5',
      27: '6',
      28: '7',
      29: '8',
      30: '9',

      // Function keys
      59: 'F1',
      60: 'F2',
      61: 'F3',
      62: 'F4',
      63: 'F5',
      64: 'F6',
      65: 'F7',
      66: 'F8',
      67: 'F9',
      68: 'F10',
      69: 'F11',
      70: 'F12',

      // Other keys
      2: 'Tab',
      3: 'Enter',
      4: 'Shift',
      5: 'Control',
      6: 'Alt',
      9: 'Escape',
      10: ' ',
      11: 'PageUp',
      12: 'PageDown',
      13: 'End',
      14: 'Home',
      15: 'ArrowLeft',
      16: 'ArrowUp',
      17: 'ArrowRight',
      18: 'ArrowDown',
      19: 'Insert',
      20: 'Delete',
      57: 'Meta',
      58: 'ContextMenu',

      // Additional keys
      85: ';',
      86: '=',
      87: ',',
      88: '-',
      89: '.',
      90: '/',
      91: '`',
      92: '[',
      93: '\\',
      94: ']',
      95: "'",

      // Numpad keys
      98: '0',
      99: '1',
      100: '2',
      101: '3',
      102: '4',
      103: '5',
      104: '6',
      105: '7',
      106: '8',
      107: '9',
      108: '*',
      109: '+',
      111: '-',
      112: '.',
      113: '/',
    }

    // Extract modifiers and keyCode
    const ctrlKey = !!(keybinding & monaco.KeyMod.CtrlCmd)
    const altKey = !!(keybinding & monaco.KeyMod.Alt)
    const shiftKey = !!(keybinding & monaco.KeyMod.Shift)
    const metaKey = false // Monaco uses CtrlCmd for both

    // Get the key without modifiers
    const keyCode = keybinding & 0xff
    const key = KEY_CODE_MAP[keyCode]

    if (!key) {
      console.warn('Unsupported Monaco keybinding:', keybinding)
      return null
    }

    return { ctrlKey, altKey, shiftKey, metaKey, key }
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
      this.fullscreendecorators = this.editor.createDecorationsCollection([
        {
          range: new monaco.Range(0, 0, 500, 500),
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
  }
}
