import AutoImport, { regexTokeniser } from '@kareemkermad/monaco-auto-import'
import { Monaco } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type * as m from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

import { initVimMode } from 'monaco-vim'

// https://github.com/brijeshb42/monaco-themes/tree/master

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
  private readonly autoimport: AutoImport
  private vimMode: m.editor.IStandaloneCodeEditor | null
  private fullscreendecorators: m.editor.IEditorDecorationsCollection | null
  private models: Record<string, monaco.editor.ITextModel> = {}

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

  addKeybind(keybinding: number, handler: (...args: any[]) => void) {
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
    monaco.languages.typescript.javascriptDefaults.setExtraLibs([])
  }

  /** If `packageName` given will also add autoimports */
  addTypings(typings: string, uri: string, packageName?: string) {
    if (this.models[uri]) return
    console.log(`Adding typings for ${uri}`)
    // monaco.languages.typescript.javascriptDefaults.addExtraLib(typings, uri)
    if (typeof packageName === 'string') {
      this.autoimport.imports.saveFile({
        path: packageName,
        aliases: [packageName],
        imports: regexTokeniser(typings),
      })
    }
    monaco.languages.typescript.typescriptDefaults.addExtraLib(typings, uri)
    // force update current model
    const currentModel = this.editor.getModel()!
    monaco.editor.setModelLanguage(currentModel, 'typescript')
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
