import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  hoverTooltip,
} from '@codemirror/view'
import {
  EditorState,
  Compartment,
  StateField,
  StateEffect,
} from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
  CompletionContext,
} from '@codemirror/autocomplete'
import {
  foldGutter,
  indentOnInput,
  bracketMatching,
  foldKeymap,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { vim } from '@replit/codemirror-vim'
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap'
import { Settings } from '../settings/Settings'
import { editorEvents } from '../events/events'
import './editor.css'
import ts, { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript'
import { vscodeLight } from '@uiw/codemirror-theme-vscode'
import {
  linter,
  lintGutter,
  Diagnostic,
  setDiagnostics,
} from '@codemirror/lint'

export const typescriptCompilerOptions: ts.CompilerOptions = {
  target: ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  moduleResolution: ModuleResolutionKind.Classic,
  esModuleInterop: true,
  module: ModuleKind.ESNext,
  noEmit: true,
}

export interface EditorSettings {
  value?: string
}

export class Editor {
  private view: EditorView
  private themeCompartment = new Compartment()
  private vimCompartment = new Compartment()
  private lineNumberCompartment = new Compartment()
  private keymapCompartment = new Compartment()
  private customKeybindings: {
    key: string
    run: (view: EditorView) => boolean
  }[] = []
  private _html: HTMLElement
  private vimStatus: HTMLElement | null = document.getElementById('vim-status')
  private tsWorker: Worker
  private diagnostics: readonly Diagnostic[] = []
  private documentVersion = 0
  private updateTimeout: number | null = null

  static async create(settings: Settings): Promise<Editor> {
    const html = document.createElement('div')
    html.style.width = '100%'
    html.style.height = '100%'
    html.style.overflow = 'hidden'

    return new Editor(html, settings)
  }

  private constructor(html: HTMLElement, settings: Settings) {
    this._html = html
    this.tsWorker = new Worker(new URL('./ts.worker.ts', import.meta.url), {
      type: 'module',
    })

    // Create a document change extension that updates TypeScript worker
    const docChangeExtension = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        this.documentVersion++

        // Clear any existing timeout
        if (this.updateTimeout !== null) {
          clearTimeout(this.updateTimeout)
        }

        // Clear any existing diagnostics immediately to prevent stale diagnostics
        this.diagnostics = []
        this.view.dispatch(setDiagnostics(update.state, this.diagnostics))

        // Debounce the update to avoid too many requests
        this.updateTimeout = setTimeout(() => {
          const newContent = update.state.doc.toString()
          this.tsWorker.postMessage({
            type: 'update',
            payload: {
              fileName: 'main.ts',
              code: newContent,
              version: this.documentVersion,
            },
          })
          this.updateTimeout = null
        }, 300) // 300ms debounce
      }
    })

    const tsLinter = linter(
      () => {
        return this.diagnostics
      },
      {
        delay: 0,
      },
    )

    const tsHover = hoverTooltip((_view, pos) => {
      const currentVersion = this.documentVersion
      this.tsWorker.postMessage({
        type: 'hover',
        payload: {
          fileName: 'main.ts',
          position: pos,
          version: currentVersion,
        },
      })
      return new Promise((resolve) => {
        const onMessage = (event: MessageEvent) => {
          if (
            event.data.type === 'hover' &&
            event.data.payload.fileName === 'main.ts' &&
            event.data.payload.version === currentVersion
          ) {
            this.tsWorker.removeEventListener('message', onMessage)
            const { quickInfo } = event.data.payload
            if (quickInfo) {
              const dom = document.createElement('div')
              dom.innerHTML = (
                quickInfo.displayParts
                  ?.map((p: ts.SymbolDisplayPart) => p.text)
                  .join('') || ''
              ).replace(/\\n/g, '<br>')
              if (quickInfo.documentation?.length) {
                const doc = document.createElement('div')
                doc.style.marginTop = '5px'
                doc.innerHTML = quickInfo.documentation
                  .map((p: ts.SymbolDisplayPart) => p.text)
                  .join('<br>')
                dom.appendChild(doc)
              }
              resolve({
                pos: quickInfo.textSpan.start,
                end: quickInfo.textSpan.start + quickInfo.textSpan.length,
                create: () => ({ dom }),
              })
            } else {
              resolve(null)
            }
          }
        }
        this.tsWorker.addEventListener('message', onMessage)
      })
    })

    const tsCompletions = autocompletion({
      override: [
        (context: CompletionContext) => {
          const currentVersion = this.documentVersion
          this.tsWorker.postMessage({
            type: 'completions',
            payload: {
              fileName: 'main.ts',
              position: context.pos,
              version: currentVersion,
            },
          })
          return new Promise((resolve) => {
            const onMessage = (event: MessageEvent) => {
              if (
                event.data.type === 'completions' &&
                event.data.payload.fileName === 'main.ts' &&
                event.data.payload.version === currentVersion
              ) {
                this.tsWorker.removeEventListener('message', onMessage)
                const { completions } = event.data.payload
                if (completions) {
                  resolve({
                    from: context.pos,
                    options: completions.entries.map(
                      (c: ts.CompletionEntry) => ({
                        label: c.name,
                        type: c.kind.toLowerCase(),
                      }),
                    ),
                  })
                } else {
                  resolve(null)
                }
              }
            }
            this.tsWorker.addEventListener('message', onMessage)
          })
        },
      ],
    })

    // Create the initial state
    const state = EditorState.create({
      doc: '',
      extensions: [
        vscodeLight,
        // Basic editor functionality
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        tsCompletions,
        rectangularSelection(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

        // Language support
        javascript({
          typescript: true,
          jsx: false,
        }),
        lintGutter(),
        tsLinter,
        tsHover,
        docChangeExtension,

        // Keymaps
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...vscodeKeymap,
        ]),

        // Theme compartment
        this.themeCompartment.of([]),

        // Vim compartment
        this.vimCompartment.of([]),

        // Line number compartment
        this.lineNumberCompartment.of([]),

        this.keymapCompartment.of([]),

        EditorView.lineWrapping,
      ],
    })

    // Create the view
    this.view = new EditorView({
      state,
      parent: html,
    })

    this.tsWorker.onmessage = (event) => {
      if (
        event.data.type === 'diagnostics' &&
        event.data.payload.fileName === 'main.ts'
      ) {
        // Always use current document state, not version checking for diagnostics
        // since the document might have changed since the request was made
        const currentDocLength = this.view.state.doc.length
        this.diagnostics = event.data.payload.diagnostics
          .filter((d: any) => {
            return (
              d.start !== undefined &&
              d.start !== null &&
              d.start >= 0 &&
              d.start < currentDocLength &&
              d.length !== undefined &&
              d.length > 0
            )
          })
          .map((d: any) => {
            const startPos = Math.max(
              0,
              Math.min(d.start, currentDocLength - 1),
            )
            const endPos = Math.max(
              startPos,
              Math.min(d.start + d.length, currentDocLength),
            )
            return {
              from: startPos,
              to: endPos,
              severity:
                ['warning', 'error', 'info', 'info'][d.category] || 'error',
              message: d.message || 'Unknown error',
            } as Diagnostic
          })

        // Use a timeout to ensure the view state is stable before applying diagnostics
        setTimeout(() => {
          if (this.view && this.view.state) {
            this.view.dispatch(
              setDiagnostics(this.view.state, this.diagnostics),
            )
          }
        }, 0)
      }
    }

    // Listen for settings changes
    editorEvents.onPattern('editor', ({}) => {
      this.updateFromSettings(settings)
    })

    this.updateFromSettings(settings)
  }

  updateFromSettings(settings: Settings) {
    const values = settings.values
    const effects = [
      this.setFullscreenMode(values['editor.fullscreen']),
      this.setRelativeLineLength(values['editor.relative_lines']),
      this.setVimMode(values['editor.vim']),
      this.setVimMode(values['editor.format_on_render']),
    ]

    this.view.dispatch({ effects })
  }

  html(): HTMLElement {
    return this._html
  }

  layout(_dimension?: { width: number; height: number }) {
    // TODO: CodeMirror handles layout automatically
    this.view.requestMeasure()
  }

  async format() {}

  addKeybind(key: string, handler: (...args: any[]) => void) {
    this.customKeybindings.push({
      key,
      run: (view: EditorView) => {
        handler(view)
        return true
      },
    })

    this.view.dispatch({
      effects: this.keymapCompartment.reconfigure(
        keymap.of(this.customKeybindings),
      ),
    })
  }

  show() {
    // Show vim status if enabled - simplified version
    if (this.vimStatus) {
      this.vimStatus.style.display = 'block'
    }
    this.html().style.display = 'block'
  }

  getValue(): string {
    return this.view.state.doc.toString()
  }

  setValue(value: string) {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: value,
      },
    })
    // Document change extension will handle the worker update
  }

  // Compatibility methods for the existing interface
  clearTypings() {
    // Clear all library typings from the worker
    this.tsWorker.postMessage({
      type: 'clearTypings',
      payload: {},
    })
  }

  addTypings(typings: string, uri: string, packageName?: string) {
    // Add typings to the TypeScript worker
    this.tsWorker.postMessage({
      type: 'addTypings',
      payload: { typings, uri, packageName },
    })
  }

  private setVimMode(value: boolean) {
    if (value) {
      const vimConfig = vim()

      if (this.vimStatus) this.vimStatus.style.display = 'block'
      return this.vimCompartment.reconfigure([vimConfig])
    } else {
      if (this.vimStatus) this.vimStatus.style.display = 'none'
      return this.vimCompartment.reconfigure([])
    }
  }

  private setRelativeLineLength(value: boolean) {
    // Update line numbers
    if (value) {
      return this.lineNumberCompartment.reconfigure([
        lineNumbers({
          formatNumber: (n, state) => {
            const line = state.doc.lineAt(state.selection.main.head)
            const currentLine = line.number
            const relativeNumber = Math.abs(n - currentLine)
            return n === currentLine ? String(n) : String(relativeNumber)
          },
        }),
      ])
    } else {
      return this.lineNumberCompartment.reconfigure([lineNumbers()])
    }
  }

  private setFullscreenMode(value: boolean) {
    if (value) {
      return this.themeCompartment.reconfigure([
        EditorView.theme({
          '&': {
            backgroundColor: 'transparent',
          },
          '.cm-editor': {
            backgroundColor: 'transparent',
          },
          '.cm-scroller': {
            backgroundColor: 'rgba(30, 30, 30, 0.8)',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '.cm-gutters': {
            backgroundColor: 'rgba(30, 30, 30, 0.8)',
            color: '#ccc',
          },
          '.cm-content': {
            color: '#fff',
          },
          '.cm-cursor': {
            borderColor: '#fff',
          },
        }),
      ])
    } else {
      return this.themeCompartment.reconfigure([])
    }
  }
}
