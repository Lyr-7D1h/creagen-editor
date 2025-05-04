import { DefaultSettingsConfig } from '../settings/defaultSettingsConfig'

class LocalStorage {
  set(id: 'settings', item: DefaultSettingsConfig) {
    globalThis.localStorage.setItem(id, JSON.stringify(item))
  }

  get(id: 'settings'): null | any {
    const v = globalThis.localStorage.getItem(id)
    if (v === null) return null
    return JSON.parse(v)
  }
}

export const localStorage = new LocalStorage()
