import z from 'zod'
import { editorEvents } from '../events/events'
import type { MessageId } from '../logs/logger'
import { createContextLogger, Severity } from '../logs/logger'
import { localStorage } from '../storage/LocalStorage'
import type { CreagenEditor } from './CreagenEditor'

export type CommandHandler = (editor: CreagenEditor) => void

let toggleHideAllMessageId: MessageId | null = null

const logger = createContextLogger('command')
export const COMMANDS = {
  welcome: {
    description: 'Open up the welcome screen',
    handler: () => {
      editorEvents.emit('welcome', true)
    },
  },
  new: {
    description: 'New sketch',
    handler: (editor: CreagenEditor) => {
      editor.new().catch(logger.error)
    },
  },
  'editor.run': {
    description: 'Run/Render the current code',
    handler: (editor: CreagenEditor) => {
      ;(async () => {
        let a: number | undefined
        if (CREAGEN_MODE === 'dev') a = performance.now()
        if (editor.settings.values['editor.format_on_render'] === true) {
          await editor.editor.format()
        }
        await Promise.all([editor.commit(), editor.render()])
        if (CREAGEN_MODE === 'dev' && a !== undefined) {
          logger.debug('Render took ' + (performance.now() - a) + 'ms')
        }
      })().catch(logger.error)
    },
  },
  'editor.toggleFullscreen': {
    description: 'Toggle fullscreen mode',
    handler: (editor: CreagenEditor) =>
      editor.settings.set(
        'editor.fullscreen',
        !editor.settings.get('editor.fullscreen'),
      ),
  },
  'editor.toggleHideAll': {
    description: 'Toggle hide all UI elements',
    handler: (editor: CreagenEditor) => {
      const set = !editor.settings.get('hide_all')
      if (set) {
        toggleHideAllMessageId = logger.log(
          Severity.Info,
          `Toggled hide all press ${editor.getKeybindKeyString('editor.toggleHideAll')} to unhide`,
          10000,
        )

        // ensure control panel is not shown
        localStorage.set('control-panel-open', false)
      } else {
        if (toggleHideAllMessageId != null)
          logger.remove(toggleHideAllMessageId)
      }
      editor.settings.set('hide_all', set)
    },
  },
  'editor.toggleMenu': {
    description: 'Toggle side menu',
    handler: () => {
      localStorage.set('menu-view', !(localStorage.get('menu-view') ?? false))
    },
  },
  'editor.freeze': {
    description: 'Freeze sandbox',
    handler: (editor: CreagenEditor) => {
      if (editor.sandbox.isFrozen) {
        return
      }
      editor.sandbox.freeze()
    },
  },
  'editor.toggleControlPanel': {
    description: 'Toggle control panel',
    handler: () => {
      localStorage.set(
        'control-panel-open',
        !(localStorage.get('control-panel-open') ?? true),
      )
    },
  },
  'sandbox.toggleQR': {
    description: 'Toggle controller qr in the sandbox',
    handler: (editor: CreagenEditor) => {
      editor.settings.set('show_qr', !editor.settings.get('show_qr'))
    },
  },
}

export const commandSchema = z.string().transform((data, ctx) => {
  if (!(data in COMMANDS)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid command ${data}`,
    })
    return z.NEVER
  }
  return data as Command
})

export type Command = keyof typeof COMMANDS
