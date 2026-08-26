import { editorEvents } from '../events/events'

/** Require a prompt login */
export function promptLogin(message?: string) {
  editorEvents.emit('login-prompt', message == null ? {} : { message })
}
