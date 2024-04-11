import * as genart from '@lyr_7d1h/genart'
import * as monaco from 'monaco-editor'
import { Editor } from './editor'
import { Settings } from './settings'
import { error, warn } from './error'
import { type ID, IDFromString, IDToString, createID } from './id'
import { IndexDB, LocalStorage } from './storage'

export type LoadableObject =
  | Node
  | {
      html: () => Node
    }

export class Generator {
  private readonly settings: Settings
  private readonly editor: Editor
  private readonly sandbox: HTMLIFrameElement
  private readonly resizer: HTMLElement

  private readonly localStorage: LocalStorage
  private readonly indexdb: IndexDB
  private active_id?: ID

  constructor() {
    this.settings = new Settings()
    this.indexdb = new IndexDB()
    this.localStorage = new LocalStorage()
    this.editor = new Editor()
    this.sandbox = document.getElementById('sandbox')! as HTMLIFrameElement
    this.resizer = document.getElementById('resizer')!
    this.setupKeybinds()
    this.setupSandbox()
    this.setupResizer()

    // allow for going back to previous code using browser history
    addEventListener('popstate', () => {
      this.loadCode().catch(error)
    })
    // load initial code
    this.loadCode()
      .then(() => {
        this.setupSettings()
      })
      .catch(error)
  }

  async load() {}

  async loadCode() {
    const path = window.location.pathname.replace('/', '')

    if (path.length === 0) return

    const id = IDFromString(path)

    if (id === null) {
      error('invalid id given')
      return
    }
    const value = await this.indexdb.get(id)
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
    window.document.body.appendChild(container)

    for (const [k, v] of Object.entries(genart)) {
      window[k] = v
    }
    window.load = (obj: LoadableObject) => {
      if (obj instanceof Node) {
        container.appendChild(obj)
      } else {
        container.appendChild(obj.html())
      }
    }
  }

  setupSettings() {
    this.settings.addParam('Editor', 'vim', false, (v) => {
      this.editor.setVimMode(v)
    })
    this.settings.addParam('Editor', 'fullscreen', false, (v) => {
      if (v) {
        this.resizer.style.display = 'none'
        this.editor.html().style.width = '100vw'
        this.sandbox.style.width = '100vw'
        this.sandbox.style.left = '0'
        this.editor.setFullscreenMode(v)

        this.localStorage.set('settings', this.settings.export())
      } else {
        this.resizer.style.display = 'block'
        this.resizer.style.left = '30vw'
        this.editor.html().style.width = '30vw'
        this.sandbox.style.width = '70vw'
        this.sandbox.style.left = '30vw'
        this.editor.setFullscreenMode(v)

        this.localStorage.set('settings', this.settings.export())
      }
    })

    const state = this.localStorage.get('settings')
    if (state) {
      this.settings.import(state)
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

  setupResizer() {
    const resizer = this.resizer
    const editor = this.editor
    const sandbox = this.sandbox

    function move(e: MouseEvent) {
      const editorWidth = e.clientX
      sandbox.style.left =
        resizer.style.left =
        editor.html().style.width =
          editorWidth + 'px'
      sandbox.style.width = screen.width - editorWidth + 'px'
    }
    function up() {
      document.removeEventListener('mouseup', up, false)
      document.removeEventListener('mousemove', move, false)
    }
    resizer.addEventListener(
      'mousedown',
      () => {
        document.addEventListener('mouseup', up, false)
        document.addEventListener('mousemove', move, false)
      },
      false,
    )
  }

  async render() {
    console.debug('rendering code')
    const code = this.editor.getValue()

    // store code and change url
    const id = await createID(code)
    await this.indexdb.set(id, {
      code,
      createdOn: id.date,
      previous: this.active_id,
    })
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
    // TODO: wait for execution
    doc.body.appendChild(script)

    setTimeout(() => {
      this.settings.updateRenderSettings(
        this.sandbox.contentDocument!.getElementById('container')!,
      )
    }, 300)
  }
}
