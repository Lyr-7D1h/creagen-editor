import * as monaco from 'monaco-editor'
import type * as m from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

import { bundleDefinitions } from '../bundle'
import { initVimMode } from 'monaco-vim'

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
monaco.editor.defineTheme('genart', {
  base: 'vs-dark',
  inherit: true,
  colors: {
    // 'editor.background': '#00000088',
    'editor.foreground': '#ffffffff',
  },
  rules: [
    {
      token: 'identifier',
      foreground: '#ffffff',
    },
    {
      foreground: '#57a2ff',
      token: 'keyword',
    },
    // {
    //   token: 'identifier.function',
    //   foreground: '#DCDCAA',
    // },
    // {
    //   token: 'type',
    //   foreground: '#1AAFB0',
    // },
  ],
})

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

export class Editor {
  private readonly editor: m.editor.IStandaloneCodeEditor

  constructor(options?: { value?: string }) {
    this.editor = monaco.editor.create(document.getElementById('editor')!, {
      value: options?.value ?? '',
      language: 'javascript',
      minimap: { enabled: false },
      tabSize: 2,
      theme: 'genart',
    })
    const _vimMode = initVimMode(
      this.editor,
      document.getElementById('my-statusbar'),
    )
  }

  addKeybind(keybinding: number, handler: (...args: any[]) => void) {
    this.editor.addCommand(keybinding, handler)
  }

  getValue() {
    return this.editor.getValue()
  }

  setValue(value: string) {
    this.editor.setValue(value)
  }
}
