import { localStorage } from '../storage/LocalStorage'
import * as monaco from 'monaco-editor'
import type * as m from 'monaco-editor'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'

import './editor.css'

import { initVimMode } from 'monaco-vim'
import type { Settings } from '../settings/Settings'
import { editorEvents } from '../events/events'
import { createContextLogger } from '../logs/logger'
import { LruCache } from '../shared/LruCache'
import type { CompletionEntryData, CompletionInfo } from 'typescript'
import { type CompletionEntryDetails } from 'typescript'

const logger = createContextLogger('editor')

export type Monaco = typeof m

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
      return new Worker(
        new URL('../workers/tsAutoImportWorker.ts', import.meta.url),
        { type: 'module' },
      )
    }
    return new editorWorker()
  },
}

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
    'editor.background': '#00000000',
    'editor.lineHighlightBackground': '#00000088',
    'editorCursor.foreground': '#ffffff',
  },
  rules: [],
}

export const typescriptCompilerOptions = {
  target: monaco.typescript.ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
  esModuleInterop: true,
  module: monaco.typescript.ModuleKind.ESNext,
  noEmit: true,
}
export interface EditorSettings {
  value?: string
}

function handleBeforeMount(monaco: Monaco) {
  monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    // 1378,1375: allow await on top level
    diagnosticCodesToIgnore: [1375, 1378],
  })
  monaco.typescript.typescriptDefaults.setCompilerOptions(
    typescriptCompilerOptions,
  )
  monaco.editor.defineTheme('creagen', creagenLightTheme)
  monaco.editor.defineTheme('creagen-fullscreen', creagenFullscreenTheme)
}

function normalizeUriPath(value: string) {
  try {
    if (value.startsWith('file:///')) {
      return decodeURIComponent(new URL(value).pathname)
    }
  } catch {
    // Keep raw value if URL parsing fails.
  }
  return value
}

function getImportEditsFromDetails(
  model: monaco.editor.ITextModel,
  details: CompletionEntryDetails | undefined,
): monaco.languages.TextEdit[] | undefined {
  if (details == null || details.codeActions == null) return undefined

  const modelFileNames = new Set([
    model.uri.toString(),
    model.uri.toString(true),
    normalizeUriPath(model.uri.toString()),
    normalizeUriPath(model.uri.toString(true)),
  ])

  const edits: monaco.languages.TextEdit[] = []
  for (const action of details.codeActions) {
    for (const change of action.changes) {
      const changeFileName = normalizeUriPath(change.fileName)
      if (
        !modelFileNames.has(change.fileName) &&
        !modelFileNames.has(changeFileName)
      ) {
        continue
      }

      for (const textChange of change.textChanges) {
        const start = model.getPositionAt(textChange.span.start)
        const end = model.getPositionAt(
          textChange.span.start + textChange.span.length,
        )
        edits.push({
          range: new monaco.Range(
            start.lineNumber,
            start.column,
            end.lineNumber,
            end.column,
          ),
          text: textChange.newText,
        })
      }
    }
  }

  return edits.length > 0 ? edits : undefined
}

interface AutoImportCompletionMeta {
  file: string
  offset: number
  entryName: string
  source?: string
  data?: CompletionEntryData
}

type AutoImportCompletionItem = monaco.languages.CompletionItem & {
  __autoImportMeta?: AutoImportCompletionMeta
}

const DETAILS_CACHE_MAX_ENTRIES = 400

// very unlikely characters to be contains in data
const CACHE_KEY_SEPARATOR = '\u001f'
const CACHE_KEY_DATA_SEPARATOR = '\u001e'

function buildAutoImportDetailsCacheKey(
  meta: AutoImportCompletionMeta,
): string {
  const dataKey =
    meta.data == null
      ? ''
      : Object.entries(meta.data as unknown as Record<string, unknown>)
          .filter(([, value]) => value !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(
            ([key, value]) =>
              `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`,
          )
          .join(CACHE_KEY_DATA_SEPARATOR)

  return [
    meta.file,
    String(meta.offset),
    meta.entryName,
    meta.source ?? '',
    dataKey,
  ].join(CACHE_KEY_SEPARATOR)
}

interface AutoImportWorker {
  getCompletionsWithImportsAtPosition(
    file: string,
    position: number,
  ): Promise<CompletionInfo | undefined>
  getCompletionEntryDetailsWithImports(
    file: string,
    position: number,
    entryName: string,
    source?: string,
    data?: CompletionEntryData,
  ): Promise<CompletionEntryDetails | undefined>
}
function registerCompletionProvider() {
  return monaco.typescript
    .getTypeScriptWorker()
    .then((getWorker) => getWorker())
    .then((worker: unknown) => {
      const autoImportWorker = worker as AutoImportWorker

      const detailsCache = new LruCache<
        string,
        Promise<CompletionEntryDetails | undefined>
      >(DETAILS_CACHE_MAX_ENTRIES)

      const getDetails = (meta: AutoImportCompletionMeta) => {
        const cacheKey = buildAutoImportDetailsCacheKey(meta)
        const cached = detailsCache.get(cacheKey)
        if (cached != null) return cached

        const request = autoImportWorker.getCompletionEntryDetailsWithImports(
          meta.file,
          meta.offset,
          meta.entryName,
          meta.source,
          meta.data,
        )
        detailsCache.set(cacheKey, request)
        return request
      }

      monaco.languages.registerCompletionItemProvider('typescript', {
        triggerCharacters: ['.', '"', "'", '/', '@'],
        async provideCompletionItems(model, position) {
          const file = model.uri.toString()
          const offset = model.getOffsetAt(position)

          const completions =
            await autoImportWorker.getCompletionsWithImportsAtPosition(
              file,
              offset,
            )

          const wordAtPosition = model.getWordAtPosition(position)
          const baseRange = wordAtPosition
            ? new monaco.Range(
                position.lineNumber,
                wordAtPosition.startColumn,
                position.lineNumber,
                wordAtPosition.endColumn,
              )
            : new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column,
              )

          const suggestions: AutoImportCompletionItem[] = []
          for (const completion of completions?.entries ?? []) {
            if (!completion.data?.moduleSpecifier) continue

            const startPosition = completion.replacementSpan
              ? model.getPositionAt(completion.replacementSpan.start)
              : baseRange.getStartPosition()
            const endPosition = completion.replacementSpan
              ? model.getPositionAt(
                  completion.replacementSpan.start +
                    completion.replacementSpan.length,
                )
              : baseRange.getEndPosition()

            const item: AutoImportCompletionItem = {
              label: {
                label: completion.name,
                description: completion.data.moduleSpecifier,
              },
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: completion.insertText ?? completion.name,
              range: new monaco.Range(
                startPosition.lineNumber,
                startPosition.column,
                endPosition.lineNumber,
                endPosition.column,
              ),
              sortText: `~${completion.sortText ?? completion.name}`,
              __autoImportMeta: {
                file,
                offset,
                entryName: completion.name,
                source: completion.source,
                data: completion.data,
              },
            }

            suggestions.push(item)
          }

          // if first suggestion is a suggestion from an import fetch the details
          if (suggestions[0]?.__autoImportMeta != null) {
            void getDetails(suggestions[0].__autoImportMeta)
          }

          return {
            suggestions,
            incomplete: true,
          }
        },
        async resolveCompletionItem(item) {
          const completionItem = item as AutoImportCompletionItem
          const meta = completionItem.__autoImportMeta
          if (meta == null) return completionItem

          const model = monaco.editor.getModel(monaco.Uri.parse(meta.file))
          if (model == null) return completionItem

          const details = await getDetails(meta)
          completionItem.additionalTextEdits = getImportEditsFromDetails(
            model,
            details,
          )
          return completionItem
        },
      })
    })
}

/** The actual code editor, responsible for text modification */
export class Editor {
  private readonly editor: m.editor.IStandaloneCodeEditor
  private vimMode: m.editor.IStandaloneCodeEditor | null
  private vimRef?: HTMLElement
  private fullscreendecorators: m.editor.IEditorDecorationsCollection | null
  private readonly typings = new Map<string, monaco.IDisposable>()
  private readonly _html

  private cleanAlternativeVersionId: number
  private dirty = false

  static create(settings: Settings) {
    handleBeforeMount(monaco)

    const html = document.createElement('div')
    html.style.width = '100%'
    html.style.height = '100%'
    const editor = monaco.editor.create(html, {
      folding: settings.get('editor.folding'),
      showFoldingControls: 'always',
      foldingHighlight: true,
      foldingMaximumRegions: 5000,
      minimap: { enabled: false },
      tabSize: 2,
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
      automaticLayout: true,
      language: 'typescript',
      theme: 'creagen',
      scrollBeyondLastLine: false,
      fixedOverflowWidgets: true,
    })

    return new Editor(html, settings, editor)
  }

  constructor(
    html: HTMLElement,
    settings: Settings,
    editor: m.editor.IStandaloneCodeEditor,
  ) {
    this._html = html
    this.editor = editor
    registerCompletionProvider().catch(logger.error)
    this.vimMode = null
    this.fullscreendecorators = null
    this.cleanAlternativeVersionId = this.getAlternativeVersionId()

    editorEvents.on('settings:changed', ({ key }) => {
      if (key.startsWith('editor')) this.updateFromSettings(settings)
    })

    this.updateFromSettings(settings)

    this.editor.onDidChangeModelContent(() => {
      const wasDirty = this.dirty
      this.updateDirtyState()
      if (this.dirty === wasDirty) return
      editorEvents.emit('editor:code-dirty', undefined)
    })

    // Save scroll position when the page is about to unload
    const scrollPosition = localStorage.get('editor-scroll-position')
    if (scrollPosition != null) this.setScrollPosition(scrollPosition)
    window.addEventListener('beforeunload', (event) => {
      const position = this.editor.getScrollTop()
      localStorage.set('editor-scroll-position', position)

      if (!this.isDirty()) return
      event.preventDefault()
      // Required for some browsers to show the native unsaved changes prompt.
      event.returnValue = ''
    })
  }

  updateFromSettings(settings: Settings) {
    this.setRelativeLines(settings.get('editor.relative_lines'))
    this.setFullscreenMode(settings.get('editor.fullscreen'))
    this.setVimMode(settings.get('editor.vim'))
    this.setFolding(settings.get('editor.folding'))
  }

  html() {
    return this._html
  }

  layout(dimension?: monaco.editor.IDimension) {
    this.editor.layout(dimension)
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
  addKeybind(keybinding: number, handler: (...args: unknown[]) => void) {
    // Register with Monaco editor
    this.editor.addCommand(keybinding, handler)
  }

  private setRelativeLines(value: boolean) {
    if (value) {
      this.editor.updateOptions({ lineNumbers: 'relative' })
    } else {
      this.editor.updateOptions({ lineNumbers: 'on' })
    }
  }

  private setFolding(value: boolean) {
    this.editor.updateOptions({ folding: value })
  }

  setVimStatusElement(element: HTMLElement) {
    this.vimRef = element
    // If vim mode is already enabled, reinitialize it with the new element
    if (this.vimMode !== null) {
      this.vimMode.dispose()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.vimMode = initVimMode(this.editor, element)
    }
  }

  private setVimMode(value: boolean) {
    if (value && this.vimMode === null) {
      // Use the provided vim ref if available, otherwise fall back to getElementById
      const vimStatusElement =
        this.vimRef ?? document.getElementById('vim-status')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.vimMode = initVimMode(this.editor, vimStatusElement)
    } else if (!value && this.vimMode !== null) {
      this.vimMode.dispose()
      this.vimMode = null
    }
  }

  /** set background transparent and make code highly visable */
  setFullscreenMode(value: boolean) {
    if (value) {
      monaco.editor.setTheme('creagen-fullscreen')
      const value = this.getValue()
      this.fullscreendecorators = this.editor.createDecorationsCollection([
        {
          range: new monaco.Range(0, 0, value.length + 1, 0),
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

  clearTypings() {
    logger.info('clearing typings')
    // Dispose all individual typings
    for (const disposable of this.typings.values()) {
      disposable.dispose()
    }
    // Clear the typings map
    this.typings.clear()
    // Also clear all extra libs as a fallback
    monaco.typescript.typescriptDefaults.setExtraLibs([])
  }

  typingsExist(uri: string) {
    return this.typings.has(uri)
  }

  addTypings(typings: string, uri: string) {
    if (this.typingsExist(uri)) return
    logger.info(`Adding typings for ${uri}`)
    const disposable = monaco.typescript.typescriptDefaults.addExtraLib(
      typings,
      uri,
    )
    this.typings.set(uri, disposable)
  }

  removeTypings(uri: string) {
    const disposable = this.typings.get(uri)
    if (disposable) {
      logger.info(`Removing typings for ${uri}`)
      disposable.dispose()
      this.typings.delete(uri)
    }
  }

  getValue() {
    return this.editor.getValue()
  }

  isDirty() {
    return this.dirty
  }

  markClean() {
    this.cleanAlternativeVersionId = this.getAlternativeVersionId()
    this.updateDirtyState()
    editorEvents.emit('editor:code-dirty', undefined)
  }

  setValue(value: string) {
    this.editor.setValue(value)
    this.markClean()

    if (this.fullscreendecorators) {
      this.fullscreendecorators.clear()
      this.fullscreendecorators = this.editor.createDecorationsCollection([
        {
          range: new monaco.Range(0, 0, value.length + 1, 0),
          options: {
            inlineClassName: 'creagen-fullscreen',
          },
        },
      ])
    }
  }

  /**
   * Set the scroll position of the editor
   * @param scrollTop Vertical scroll position in pixels
   * @param scrollLeft Horizontal scroll position in pixels (optional, default: current position)
   */
  setScrollPosition(scrollTop: number, scrollLeft?: number) {
    this.editor.setScrollPosition({
      scrollTop,
      scrollLeft: scrollLeft ?? this.editor.getScrollLeft(),
    })
  }

  private getAlternativeVersionId() {
    return this.editor.getModel()?.getAlternativeVersionId() ?? 0
  }

  private updateDirtyState() {
    this.dirty =
      this.getAlternativeVersionId() !== this.cleanAlternativeVersionId
  }
}
