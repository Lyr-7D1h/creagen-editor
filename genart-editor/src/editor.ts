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
const genartLightTheme: m.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  colors: {},
  rules: [],
}
const genartFullscreenTheme: m.editor.IStandaloneThemeData = {
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
monaco.editor.defineTheme('genart', genartLightTheme)
monaco.editor.defineTheme('genart-fullscreen', genartFullscreenTheme)

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
}

export class Editor {
  private readonly editor: m.editor.IStandaloneCodeEditor
  private vimMode: m.editor.IStandaloneCodeEditor | null
  private fullscreendecorators: m.editor.IEditorDecorationsCollection | null

  constructor(options?: EditorSettings) {
    this.editor = monaco.editor.create(document.getElementById('editor')!, {
      value: options?.value ?? '',
      language: 'javascript',
      minimap: { enabled: false },
      tabSize: 2,
      theme: 'genart',
      // TODO: formatting
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,

      // allow for resizing
      automaticLayout: true,
    })
    this.vimMode = null
    this.fullscreendecorators = null
  }

  async format() {
    await this.editor.getAction('editor.action.formatDocument')!.run()
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

  updateOptions(
    options: m.editor.IEditorOptions & m.editor.IGlobalEditorOptions,
  ) {
    this.editor.updateOptions(options)
  }

  /** set background transparent and make code highly visable */
  setFullscreenMode(value: boolean) {
    if (value) {
      monaco.editor.setTheme('genart-fullscreen')
      this.fullscreendecorators = this.editor.createDecorationsCollection([
        {
          range: new monaco.Range(0, 0, 500, 500),
          options: {
            inlineClassName: 'fullscreen',
          },
        },
      ])
    } else {
      if (this.fullscreendecorators) this.fullscreendecorators.clear()
      this.fullscreendecorators = null
      monaco.editor.setTheme('genart')
    }
  }

  // setOpacity(opacity: number) {
  //   const h = Math.round(opacity).toString(16)
  //   const hex = h.length === 1 ? '0' + h : h

  //   monaco.editor.defineTheme('genart', {
  //     ...genartLightTheme,
  //     colors: {
  //       'editor.background': `#333333${hex}`,
  //     },
  //   })
  //   monaco.editor.setTheme('vs')
  //   monaco.editor.setTheme('genart')
  // }

  getValue() {
    return this.editor.getValue()
  }

  setValue(value: string) {
    this.editor.setValue(value)
  }
}
