import React, { useRef } from 'react'
import MonacoEditor, { Monaco } from '@monaco-editor/react'
import AutoImport from '@kareemkermad/monaco-auto-import'
import { editor } from 'monaco-editor'
import type * as monaco from 'monaco-editor'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

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

const genartLightTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  colors: {},
  rules: [],
}
const genartFullscreenTheme: monaco.editor.IStandaloneThemeData = {
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

export interface EditorProps {
  value?: string
  width?: string
  height?: string
  minimap?: boolean
}

export function Editor({ value, width, height }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null)

  function handleBeforeMount(monaco: Monaco) {
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      // 1378,1375: allow await on top level
      diagnosticCodesToIgnore: [1375, 1378],
    })
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution:
        monaco.languages.typescript.ModuleResolutionKind.Classic,
      esModuleInterop: true,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
    })
    monaco.editor.defineTheme('genart', genartLightTheme)
    monaco.editor.defineTheme('genart-fullscreen', genartFullscreenTheme)
  }

  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    new AutoImport({
      monaco,
      editor,
      spacesBetweenBraces: true,
      doubleQuotes: true,
      semiColon: true,
      alwaysApply: false,
    })
    // here is the editor instance
    // you can store it in `useRef` for further usage
    editorRef.current = editor
  }

  return (
    <MonacoEditor
      width={width}
      height={height}
      defaultValue={value ?? ''}
      language="typescript"
      theme="genart"
      beforeMount={handleBeforeMount}
      onMount={handleEditorDidMount}
      loading={<div>Loading...</div>}
      value=""
      options={{
        minimap: { enabled: false },
        tabSize: 2,
        // TODO: formatting
        autoIndent: 'full',
        formatOnPaste: true,
        formatOnType: true,

        // allow for resizing
        automaticLayout: true,
      }}

      // minimap= { enabled: false }
      // tabSize= 2
      // theme= 'genart',
      // // TODO: formatting
      // autoIndent= 'full',
      // formatOnPaste= true,
      // formatOnType= true,

      // // allow for resizing
      // automaticLayout= true,
    />
  )
}
