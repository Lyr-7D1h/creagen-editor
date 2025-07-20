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
import { EditorState, Compartment } from '@codemirror/state'
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
import { linter, lintGutter, Diagnostic } from '@codemirror/lint'

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
        autocompletion(),
        rectangularSelection(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

        // Language support
        javascript({
          typescript: true,
          jsx: false,
        }),
        lintGutter(),

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
  }

  // Compatibility methods for the existing interface
  clearTypings() {}

  addTypings(_typings: string, _uri: string, _packageName?: string) {}

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
