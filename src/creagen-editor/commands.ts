import { CreagenEditor } from './CreagenEditor'

export type CommandHandler = (editor: CreagenEditor) => void

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
    editor.settings.set(
      'editor.hide_all',
      !editor.settings.get('editor.hide_all'),
    )
  },
}

export type Command = keyof typeof COMMANDS
