import { Command, COMMANDS, commandSchema } from './commands'
import { CreagenEditor } from './CreagenEditor'
import { Editor } from '../editor/Editor'
import z from 'zod'
import { groupBy } from '../util'
import { logger } from '../logs/logger'

export type KeyInfo = string

const keybindingSchema = z.object({
  key: z.string(),
  command: commandSchema,
  /** Define context in which the keybind is active, global by default */
  when: z.enum(['editor', 'sandbox']).array().optional(),
})
export type Keybinding = z.infer<typeof keybindingSchema>
export const customKeybindingSchema = keybindingSchema.extend({
  /** Use in case of removing a default keybind */
  remove: z.boolean(),
})
/** A keybinding to overwrite a default keybind */
export type CustomKeybinding = z.infer<typeof customKeybindingSchema>

export type ActiveKeybinding = Keybinding & { custom: boolean }

const defaultKeybindings: Keybinding[] = [
  {
    key: 'ctrl+shift+enter',
    command: 'editor.run',
  },
  {
    key: 'ctrl+shift+f',
    command: 'editor.toggleFullscreen',
  },
  {
    // TODO: enable also in sandbox
    key: 'ctrl+f11',
    command: 'editor.toggleHideAll',
  },
  {
    key: 'ctrl+e',
    command: 'editor.toggleMenu',
  },
]

type Handler = (...args: any[]) => void
export class Keybindings {
  /** list of all the keybindings, allows for multiple keybindings to a single command */
  private keybindings: ActiveKeybinding[] = []
  private handlers: Map<Command, Handler> = new Map()
  private browserHandlers: ((e: KeyboardEvent) => void)[] = []
  private editor: CreagenEditor

  /** User deltas for adding and removing keybinds */
  private customKeybindings: CustomKeybinding[]

  constructor(customKeybindings: CustomKeybinding[], editor: CreagenEditor) {
    this.customKeybindings = customKeybindings
    this.editor = editor
    this.setupKeybindings()
  }

  private setupKeybindings() {
    for (const handler of this.browserHandlers) {
      document.removeEventListener('keydown', handler)
    }
    this.browserHandlers = []
    this.handlers.clear()

    const binds = groupBy(
      defaultKeybindings.map((kb) => ({ ...kb, custom: false })),
      'command',
    )

    for (const bind of this.customKeybindings) {
      if (bind.remove) {
        binds[bind.command] = binds[bind.command].filter(
          (kb) => kb.key !== bind.key,
        )
        continue
      }
      binds[bind.command].push({ ...bind, custom: true })
    }

    this.keybindings = Object.values(binds).flat()
    for (const kb of this.keybindings) {
      const command = kb.command
      const handler = () => COMMANDS[command].handler(this.editor)
      this.handlers.set(command, handler)
      this.addKeybind(this.editor.editor, kb, handler)
    }
  }

  private addKeybind(
    _editor: Editor,
    keybind: Keybinding,
    handler: (...args: any[]) => void,
    preventDefault: boolean = true,
  ) {
    logger.trace(`Setting ${JSON.stringify(keybind)}`)
    // const monacoKeybinding = getMonacoKeybinding(keybind.key)
    // editor.addKeybind(monacoKeybinding, handler)
    // only in editor
    // if (keybind.when?.includes('editor')) {
    //   return
    // }

    const keyInfo = toBrowserKeyInfo(keybind.key)
    if (!keyInfo) return

    // Create browser-level handler
    const browserHandler = (e: KeyboardEvent) => {
      if (
        keyInfo.ctrlKey === e.ctrlKey &&
        keyInfo.altKey === e.altKey &&
        keyInfo.shiftKey === e.shiftKey &&
        keyInfo.metaKey === e.metaKey &&
        keyInfo.key.toLowerCase() === e.key.toLowerCase()
      ) {
        if (preventDefault) e.preventDefault()
        handler()
      }
    }
    document.addEventListener('keydown', browserHandler)
    this.browserHandlers.push(browserHandler)
  }

  getKeybindingsToCommand(command: Command) {
    return this.keybindings.filter((bind) => bind.command === command)
  }

  getKeybindings() {
    return this.keybindings
  }

  /** Add keybinding if doesn't already exist */
  async addKeybinding(key: KeyInfo, command: Command) {
    // don't allow empty keybinds
    if (key.length === 0) return null
    // Prevent adding a duplicate keybinding
    if (
      this.customKeybindings.some(
        (kb) => kb.key === key && kb.command === command,
      )
    ) {
      return null
    }

    // Add the new custom keybinding
    this.customKeybindings.push({ key, command, remove: false })
    await this.save()
    return
  }

  /** Remove a keybinding with given `key` and `command` */
  async removeKeybinding(key: string, command: Command) {
    const index = this.customKeybindings.findIndex(
      (kb) => kb.key === key && kb.command === command,
    )
    // in case its a default keybind add explicit remove
    if (index === -1) {
      this.customKeybindings.push({ key, command, remove: true })
    }
    // remove custom keybind
    delete this.customKeybindings[index]
    this.customKeybindings = this.customKeybindings.filter(
      (kb) => typeof kb !== 'undefined',
    )
    await this.save()
    return
  }

  async reset(command: Command) {
    this.customKeybindings = this.customKeybindings.filter(
      (k) => k.command !== command,
    )
    await this.save()
  }

  async resetAll() {
    this.customKeybindings = []
    await this.save()
  }

  /** Save changes (custom) made to keybindings */
  private async save() {
    this.setupKeybindings()
    await this.editor.storage.set('custom-keybindings', this.customKeybindings)
  }
}

interface BrowserKeyInfo {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  key: string
}
/**
 * Converts a Monaco keybinding code to browser KeyboardEvent parameters
 */
export function toBrowserKeyInfo(keybinding: KeyInfo): BrowserKeyInfo | null {
  if (!keybinding) return null

  const parts = keybinding.toLowerCase().split('+')
  const key = parts.pop()

  if (!key) return null

  const result: BrowserKeyInfo = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: key,
  }

  for (const part of parts) {
    switch (part) {
      case 'ctrl':
        result.ctrlKey = true
        break
      case 'alt':
        result.altKey = true
        break
      case 'shift':
        result.shiftKey = true
        break
      case 'meta':
        result.metaKey = true
        break
      default:
        // This part is not a recognized modifier.
        // It might be an error in the keybinding string,
        // but we'll ignore it for now.
        break
    }
  }

  return result
}
