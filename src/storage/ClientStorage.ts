import { localStorage } from './LocalStorage'
import { CustomKeybinding } from '../creagen-editor/keybindings'

/** Entry point for fetching all data */
export class ClientStorage {
  constructor() {}

  // TODO: call api
  setSettings(value: unknown) {
    return Promise.resolve(localStorage.set('settings', value))
  }
  getSettings() {
    return Promise.resolve(localStorage.get('settings'))
  }
  setCustomKeybindings(keybindings: CustomKeybinding[]) {
    return Promise.resolve(localStorage.set('custom-keybindings', keybindings))
  }
  getCustomKeybindings() {
    return Promise.resolve(localStorage.get('custom-keybindings'))
  }
}
