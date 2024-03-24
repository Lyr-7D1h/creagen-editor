import * as monaco from 'monaco-editor'
import type * as m from 'monaco-editor/esm/vs/editor/editor.api'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

import { bundleDefinitions } from '../bundle'

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
  noLib: true,
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
      value: 'import * as p from "plart"\n\n',
      language: 'javascript',
    })

    this.editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        const value: string = this.editor.getValue()

        // TODO: add typescript
        // ts.preProcessFile()
        // const compiledCode = ts.transpileModule(value, {
        //   compilerOptions: {
        //     target: ts.ScriptTarget.ES2016,
        //     // allowImportingTsExtensions: true,
        //     // moduleResolution:
        //     //   monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        //     module: monaco.languages.typescript.ModuleKind.CommonJS,
        //     // noEmit: true,
        //   },
        // })

        // eslint-disable-next-line no-eval
        eval(value)
      },
    )
  }
}
