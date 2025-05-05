import { logger, MessageId, Severity } from '../logs/logger'
import { CreagenEditor } from './CreagenEditor'

export type CommandHandler = (editor: CreagenEditor) => void

let toggleHideAllMessageId: MessageId | null = null

export const COMMANDS = {
  'editor.run': (editor: CreagenEditor) => {
    editor.render()
  },
  'editor.toggleFullscreen': (editor: CreagenEditor) => {
    editor.settings.set(
      'editor.fullscreen',
      !editor.settings.get('editor.fullscreen'),
    )
  },
  'editor.toggleHideAll': (editor: CreagenEditor) => {
    const set = !editor.settings.get('hide_all')
    if (set) {
      toggleHideAllMessageId = logger.log(
        Severity.Info,
        `Toggled hide all press ${editor.keybindings.getKeybindingsToCommand('editor.toggleHideAll')[0]?.key} to unhide`,
        10000,
      )
    } else {
      if (toggleHideAllMessageId) logger.remove(toggleHideAllMessageId)
    }
    editor.settings.set('hide_all', set)
  },
}

export type Command = keyof typeof COMMANDS
