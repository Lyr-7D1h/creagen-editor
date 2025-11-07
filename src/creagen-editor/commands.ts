import z from 'zod'
import { createContextLogger, MessageId, Severity } from '../logs/logger'
import { localStorage } from '../storage/LocalStorage'
import { CreagenEditor } from './CreagenEditor'
import { editorEvents } from '../events/events'

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
  'editor.run': {
    description: 'Run/Render the current code',
    handler: (editor: CreagenEditor) => {
      let a: number | undefined
      if (CREAGEN_MODE === 'dev') a = performance.now()
      editor.render().catch(logger.error)
      if (CREAGEN_MODE === 'dev' && a !== undefined) {
        logger.debug('Render took ' + (performance.now() - a) + 'ms')
      }
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
  'editor.toggleFreeze': {
    description: 'Freeze/Unfreeze sandbox',
    handler: (editor: CreagenEditor) => {
      if (editor.sandbox.isFrozen) {
        editor.sandbox.unfreeze().catch(logger.error)
      } else {
        editor.sandbox.freeze()
      }
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
