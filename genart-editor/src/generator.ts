import * as monaco from 'monaco-editor'
import { Editor } from './editor'
import { Options } from './options'

export class Generator {
  private readonly options: Options
  private readonly editor: Editor
  private readonly container: HTMLIFrameElement

  constructor() {
    this.options = new Options()
    this.editor = new Editor()
    this.container = document.getElementById('container')! as HTMLIFrameElement
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
    console.log('render')
    const code = this.editor.getValue()
    const doc = this.container.contentDocument!
    doc.open()
    doc.write(
      `<script>
      console.log(document.body)
      document.body.appendChild(document.createElement("div"))
      ${code}
    <script>
    `,
    )
    doc.close()
    this.container.contentWindow?.location.reload()

    // eslint-disable-next-line no-eval
    // eval(`
    //     const container = document.getElementById('container')
    //     ${code}
    //     `)

    this.options.render(this.container)
  }
}
