import * as monaco from 'monaco-editor'
import { Editor } from './editor'
import { Options } from './options'

export class Generator {
  private readonly options: Options
  private readonly editor: Editor
  private readonly container: HTMLElement

  constructor() {
    this.options = new Options()
    this.editor = new Editor()
    this.container = document.getElementById('container')!
    this.setupKeybinds()
  }

  setupKeybinds() {
    this.editor.addKeybind(
      monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        this.render()
      },
    )
    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
        this.render()
        event.preventDefault()
      }
    })
  }

  render() {
    const code = this.editor.getValue()
    this.container.innerHTML = ''
    // eslint-disable-next-line no-eval
    eval(`
        const container = document.getElementById('container')
        ${code}
        `)

    this.options.render(this.container)
  }
}
