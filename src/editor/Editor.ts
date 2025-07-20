import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
} from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete'
import {
  foldGutter,
  indentOnInput,
  indentUnit,
  bracketMatching,
  foldKeymap,
} from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { vim } from '@replit/codemirror-vim'
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap'
import { Settings } from '../settings/Settings'
import { editorEvents } from '../events/events'
import './editor.css'
import ts, { ModuleKind, ModuleResolutionKind, ScriptTarget } from 'typescript'

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
  private _html: HTMLElement
  private vimStatus: HTMLElement | null = document.getElementById('vim-status')

  static async create(settings: Settings): Promise<Editor> {
    const html = document.createElement('div')
    html.style.width = '100%'
    html.style.height = '100%'
    html.style.overflow = 'hidden'

    return new Editor(html, settings)
  }

  private constructor(html: HTMLElement, settings: Settings) {
    this._html = html

    // Create the initial state
    const state = EditorState.create({
      doc: '',
      extensions: [
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
        autocompletion(),
        rectangularSelection(),
        highlightSelectionMatches(),

        // Language support
        javascript({
          typescript: true,
          jsx: false,
        }),

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

        // Basic styling
        EditorView.theme({
          '&': {
            height: '100%',
            width: '100%',
          },
          '.cm-editor': {
            height: '100%',
          },
          '.cm-scroller': {
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: '14px',
            lineHeight: '1.4',
          },
          '.cm-focused': {
            outline: 'none',
          },
          // VS Code-like styling
          '.cm-editor.cm-focused .cm-selectionBackground': {
            backgroundColor: '#316AC5',
          },
          '.cm-activeLine': {
            backgroundColor: '#f5f5f5',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#f5f5f5',
          },
          '.cm-gutters': {
            backgroundColor: '#f8f8f8',
            color: '#999',
            border: 'none',
          },
          '.cm-lineNumbers .cm-gutterElement': {
            padding: '0 8px 0 8px',
          },
        }),

        // Basic options
        indentUnit.of('  '),
        EditorView.lineWrapping,
      ],
    })

    // Create the view
    this.view = new EditorView({
      state,
      parent: html,
    })

    // Listen for settings changes
    editorEvents.onPattern('editor', ({}) => {
      this.updateFromSettings(settings)
    })

    this.updateFromSettings(settings)
  }

  updateFromSettings(settings: Settings) {
    const values = settings.values
    const effects = []

    // Update line numbers
    if (values['editor.relative_lines']) {
      effects.push(
        this.lineNumberCompartment.reconfigure([
          lineNumbers({
            formatNumber: (n, state) => {
              const line = state.doc.lineAt(state.selection.main.head)
              const currentLine = line.number
              const relativeNumber = Math.abs(n - currentLine)
              return n === currentLine ? String(n) : String(relativeNumber)
            },
          }),
        ]),
      )
    } else {
      effects.push(this.lineNumberCompartment.reconfigure([lineNumbers()]))
    }

    // Update theme
    if (values['editor.fullscreen']) {
      effects.push(
        this.themeCompartment.reconfigure([
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
        ]),
      )
    } else {
      effects.push(this.themeCompartment.reconfigure([]))
    }

    // Update vim mode
    if (values['editor.vim']) {
      const vimConfig = vim()

      effects.push(this.vimCompartment.reconfigure([vimConfig]))
      if (this.vimStatus) {
        this.vimStatus.style.display = 'block'
      }
    } else {
      effects.push(this.vimCompartment.reconfigure([]))
      if (this.vimStatus) {
        this.vimStatus.style.display = 'none'
      }
    }

    // Apply all effects
    if (effects.length > 0) {
      this.view.dispatch({ effects })
    }
  }

  html(): HTMLElement {
    return this._html
  }

  layout(_dimension?: { width: number; height: number }) {
    // CodeMirror handles layout automatically
    this.view.requestMeasure()
  }

  async format() {}

  addKeybind(_key: string, _handler: (...args: any[]) => void) {
    // Add a keybinding to the editor - needs implementation with reconfiguration
    console.log('[Editor] addKeybind - needs implementation')
  }

  hide() {
    if (this.vimStatus) this.vimStatus.style.display = 'none'
    this.html().style.display = 'none'
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
  }

  // Compatibility methods for the existing interface
  clearTypings() {}

  addTypings(_typings: string, _uri: string, _packageName?: string) {}

  updateOptions(_options: any) {
    console.log(
      '[Editor] updateOptions - needs implementation based on CodeMirror options',
    )
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

  setRelativeLineLength(_value: boolean) {}

  setFullscreenMode(_value: boolean) {}
}
