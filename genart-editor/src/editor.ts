import * as monaco from 'monaco-editor'
import type * as m from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { type editor } from 'monaco-editor/esm/vs/editor/editor.api'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

import { bundleDefinitions } from '../bundle'
import { initVimMode } from 'monaco-vim'
import { rgbtohex } from '@lyr_7d1h/genart/dist/build/color'

monaco.languages.typescript.javascriptDefaults.addExtraLib(`
const container: HTMLElement;
type LoadableObject =
  | Node
  | {
      html: () => Node
    }
function load(obj: LoadableObject): void;
`)
monaco.languages.typescript.javascriptDefaults.addExtraLib(bundleDefinitions)
monaco.languages.typescript.javascriptDefaults.setModeConfiguration({
  definitions: true,
  completionItems: true,
  documentSymbols: true,
  codeActions: true,
  diagnostics: true,
  onTypeFormattingEdits: true,
})
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: false,
  noSyntaxValidation: false,
  // 1378,1375: allow await on top level
  diagnosticCodesToIgnore: [1375, 1378],
})
monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2016,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.languages.typescript.ModuleKind.CommonJS,
  noEmit: true,
})

// https://github.com/brijeshb42/monaco-themes/tree/master
const genartTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  colors: {
    // 'editor.background': '#00000088',
    // 'editor.foreground': '#ffffffff',
  },
  rules: [
    // {
    //   token: 'identifier',
    //   foreground: '#ffffff',
    // },
    // {
    //   foreground: '#57a2ff',
    //   token: 'keyword',
    // },
    // {
  ],
}
monaco.editor.defineTheme('genart', genartTheme)

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

export interface EditorSettings {
  value?: string
  vimMode?: boolean
}

export class Editor {
  private readonly editor: m.editor.IStandaloneCodeEditor
  private vimMode: m.editor.IStandaloneCodeEditor | null

  constructor(options?: EditorSettings) {
    this.editor = monaco.editor.create(document.getElementById('editor')!, {
      value: options?.value ?? '',
      language: 'javascript',
      minimap: { enabled: false },
      tabSize: 2,
      theme: 'genart',
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
      // allow for resizing
      automaticLayout: true,
    })
    this.vimMode = null

    if (options?.vimMode) this.setVimMode(options.vimMode)
  }

  html() {
    return document.getElementById('editor')!
  }

  addKeybind(keybinding: number, handler: (...args: any[]) => void) {
    this.editor.addCommand(keybinding, handler)
  }

  setVimMode(value: boolean) {
    if (value && this.vimMode === null) {
      this.vimMode = initVimMode(this.editor, document.getElementById('status'))
    } else if (!value && this.vimMode !== null) {
      this.vimMode.dispose()
      this.vimMode = null
    }
  }

  setOpacity(opacity: number) {
    const h = Math.round(opacity).toString(16)
    const hex = h.length === 1 ? '0' + h : h

    monaco.editor.defineTheme('genart', {
      ...genartTheme,
      colors: {
        'editor.background': `#000000${hex}`,
      },
    })
  }

  getValue() {
    return this.editor.getValue()
  }

  setValue(value: string) {
    this.editor.setValue(value)
  }
}
