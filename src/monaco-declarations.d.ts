declare module 'monaco-editor/esm/vs/editor/editor.worker?worker'
declare module 'monaco-editor/esm/vs/language/json/json.worker?worker'
declare module 'monaco-editor/esm/vs/language/css/css.worker?worker'
declare module 'monaco-editor/esm/vs/language/html/html.worker?worker'
declare module 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
// Add and use missing types from monaco export that would otherwise be missing in vite build
declare module 'monaco-editor/esm/vs/language/typescript/monaco.contribution' {
  export const typescriptDefaults: {
    setDiagnosticsOptions(options: Record<string, unknown>): void
    setCompilerOptions(options: Record<string, unknown>): void
    addExtraLib(content: string, filePath?: string): { dispose(): void }
    setExtraLibs(libs: Array<{ content: string; filePath?: string }>): void
  }
  export const javascriptDefaults: {
    setDiagnosticsOptions(options: Record<string, unknown>): void
    setCompilerOptions(options: Record<string, unknown>): void
  }
  export function getTypeScriptWorker(): Promise<unknown>
  export function getJavaScriptWorker(): Promise<unknown>
  export enum ScriptTarget {
    ESNext = 99,
  }
  export enum ModuleKind {
    ESNext = 99,
  }
  export enum ModuleResolutionKind {
    NodeJs = 1,
  }
}
declare module 'monaco-vim'
