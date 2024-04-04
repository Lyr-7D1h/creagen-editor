import * as genart from '@lyr_7d1h/genart'
import * as monaco from 'monaco-editor'
import { Editor } from './editor'
import { Options } from './options'
import { error, warn } from './error'
import { type ID, IDFromString, IDToString, createID } from './id'
import { LocalStorage } from './storage'

export class Generator {
  private readonly options: Options
  private readonly editor: Editor
  private readonly sandbox: HTMLIFrameElement
  private readonly storage: LocalStorage
  private active_id?: ID

  constructor() {
    this.options = new Options()
    this.storage = new LocalStorage()

    this.editor = new Editor()
    this.sandbox = document.getElementById('sandbox')! as HTMLIFrameElement
    this.setupKeybinds()
    this.setupSandbox()

    // allow for going back to previous code using browser history
    addEventListener('popstate', () => {
      this.loadCode()
    })
    // load initial code
    this.loadCode()
  }

  loadCode() {
    const id = IDFromString(window.location.pathname.replace('/', ''))
    if (id === null) {
      error('invalid id given')
      return
    }
    const value = this.storage.load(id)
    if (value === null) {
      warn(`${IDToString(id)} not found in storage`)
      return
    }
    this.editor.setValue(value.code)
    this.active_id = id
  }

  setupSandbox() {
    const window = this.sandbox.contentWindow!

    window.document.body.style.margin = '0'

    const container = window.document.createElement('div')
    container.id = 'container'
    container.setAttribute('style', 'width: 100%; height: 100%;')
    window.document.body.appendChild(container)

    for (const [k, v] of Object.entries(genart)) {
      window[k] = v
    }
    window.load = (element: Node) => {
      container.appendChild(element)
    }
  }

  setupKeybinds() {
    this.editor.addKeybind(
      monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        this.render().catch(error)
      },
    )
    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
        this.render().catch(error)
        event.preventDefault()
      }
    })
  }

  async render() {
    console.debug('rendering code')
    const code = this.editor.getValue()

    // store code and change url
    const id = await createID(code)
    this.storage.store(id, { code })
    if (id.hash !== this.active_id?.hash) {
      window.history.pushState('Genart', '', IDToString(id))
      this.active_id = id
    }

    const doc = this.sandbox.contentDocument!

    doc.getElementById('container')!.innerHTML = ''

    doc.getElementById('script')?.remove()
    const script = doc.createElement('script')
    script.type = 'module'
    script.id = 'script'
    script.innerHTML = code
    doc.body.appendChild(script)

    this.options.render(this.sandbox)
  }
}
