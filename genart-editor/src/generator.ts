import * as monaco from 'monaco-editor'
import { Editor } from './editor'
import { Settings, type SettingsConfig } from './settings'
import log from './log'
import { type ID, IDFromString, IDToString, createID } from './id'
import { IndexDB, LocalStorage } from './storage'
import { Sandbox } from './sandbox'
import { bundleDefinitions } from '../bundle'

const generatorSettingsConfig = {
  editor: {
    type: 'folder',
    title: 'Editor',
  },
  'editor.format_on_render': {
    type: 'param',
    label: 'Format on render',
    value: false,
  },
  'editor.fullscreen': {
    type: 'param',
    label: 'Fullscreen',
    value: false,
  },
  'editor.vim': {
    type: 'param',
    label: 'Vim',
    value: false,
  },
  'editor.relative_lines': {
    type: 'param',
    label: 'Relative Lines',
    value: false,
  },
}

export class Generator {
  private readonly settings: Settings<
    SettingsConfig<typeof generatorSettingsConfig>
  >

  private readonly editor: Editor
  private readonly sandbox: Sandbox
  private readonly resizer: HTMLElement

  private readonly localStorage: LocalStorage
  private readonly indexdb: IndexDB
  private active_id?: ID

  constructor() {
    this.settings = new Settings(
      generatorSettingsConfig as SettingsConfig<typeof generatorSettingsConfig>,
    )
    this.indexdb = new IndexDB()
    this.localStorage = new LocalStorage()
    this.sandbox = new Sandbox()
    this.editor = new Editor()
    this.editor.addTypings(this.sandbox.globalTypings())
    this.editor.addTypings(bundleDefinitions)

    this.resizer = document.getElementById('resizer')!
    this.setupKeybinds()
    this.setupResizer()

    // allow for going back to previous code using browser history
    addEventListener('popstate', () => {
      this.loadCode().catch(log.error)
    })
    // load initial code
    this.loadCode()
      .then(() => {
        this.setupSettings()
      })
      .catch(log.error)
  }

  async loadCode() {
    const path = window.location.pathname.replace('/', '')

    if (path.length === 0) return

    const id = IDFromString(path)

    if (id === null) {
      log.error('invalid id given')
      return
    }
    const value = await this.indexdb.get(id)
    if (value === null) {
      log.warn(`${IDToString(id)} not found in storage`)
      return
    }
    this.editor.setValue(value.code)
    this.active_id = id
  }

  setupSettings() {
    this.settings.onChange('editor.vim', (v) => {
      this.editor.setVimMode(v)
    })
    this.settings.onChange('editor.fullscreen', (v) => {
      if (v) {
        this.resizer.style.display = 'none'
        this.editor.html().style.width = '100%'
        this.sandbox.html.style.width = '100%'
        this.sandbox.html.style.left = '0'
        this.editor.setFullscreenMode(v)
      } else {
        this.resizer.style.display = 'block'
        this.resizer.style.left = '30%'
        this.editor.html().style.width = '30%'
        this.sandbox.html.style.width = '70%'
        this.sandbox.html.style.left = '30%'
        this.editor.setFullscreenMode(v)
      }
    })
    this.settings.onChange('editor.relative_lines', (v) => {
      this.editor.updateOptions({ lineNumbers: 'relative' })
    })

    // load stored settings
    const state = this.localStorage.get('settings')
    if (state) {
      this.settings.import(state)
    }

    // save settings on change
    this.settings.onChange(() => {
      this.localStorage.set('settings', this.settings.export())
    })
  }

  setupKeybinds() {
    this.editor.addKeybind(
      monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        this.render().catch(log.error)
      },
    )
    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
        this.render().catch(log.error)
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
      sandbox.html.style.left =
        resizer.style.left =
        editor.html().style.width =
          editorWidth + 'px'
      sandbox.html.style.width = screen.width - editorWidth + 'px'
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
    const info = log.info('rendering code')
    if (this.settings.get('editor.format_on_render')) {
      await this.editor.format()
    }

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

    this.sandbox.runScript(code)

    info.remove()

    // TODO: wait for execution
    setTimeout(() => {
      this.settings.updateRenderSettings(this.sandbox.container)
    }, 300)
  }
}
