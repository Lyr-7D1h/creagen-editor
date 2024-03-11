import * as ts from 'typescript'
import * as monaco from 'monaco-editor'
import * as m from 'monaco-editor/esm/vs/editor/editor.api'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

monaco.languages.typescript.typescriptDefaults.addExtraLib(`
    declare function myCustomFunction(name: string): string;
`)

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
  private meditor: m.editor.IStandaloneCodeEditor

  init() {
    this.meditor = monaco.editor.create(document.getElementById('container'), {
      value: 'console.log("asdf")',
      language: 'typescript',
    })
    this.meditor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        const value = this.meditor.getValue()

        const compiledCode = ts.transpileModule(value, {
          compilerOptions: { target: ts.ScriptTarget.ES5 },
        })


        eval(compiledCode.outputText)
      },
    )
    // m.editor.addKeybindingRule({ command })
    // this.meditor.addKey
  }
}

const value = "function hello() {\n\talert('Hello world!');\n}"
