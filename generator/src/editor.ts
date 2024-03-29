import * as monaco from 'monaco-editor'
import * as plart from 'plart'
import type * as m from 'monaco-editor/esm/vs/editor/editor.api'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

import { bundleDefinitions } from '../bundle'

// HACK: make all variables in plart global
for (const [k, v] of Object.entries(plart)) {
  window[k] = v
}

monaco.languages.typescript.javascriptDefaults.addExtraLib(`
const container: HTMLElement;
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
})
monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2016,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.languages.typescript.ModuleKind.CommonJS,
  noEmit: true,
})

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

export class Editor {
  private readonly editor: m.editor.IStandaloneCodeEditor

  constructor() {
    this.editor = monaco.editor.create(document.getElementById('editor')!, {
      // value: 'import * as p from "plart"\n\n',
      value: `const s = svg.svg()

s.text({content: "asdf", x: 10, y: 10})

container.appendChild(s.html())`,
      language: 'javascript',
      minimap: { enabled: false },
      tabSize: 2,
    })
  }

  addKeybind(keybinding: number, handler: (...args: any[]) => void) {
    this.editor.addCommand(keybinding, handler)
  }

  getValue() {
    return this.editor.getValue()
  }
}
