import { DefaultAppSettingsConfig, SettingsConfig } from './SettingsProvider'

class LocalStorage {
  set(id: 'settings', item: SettingsConfig<DefaultAppSettingsConfig>) {
    globalThis.localStorage.setItem(id, JSON.stringify(item))
  }

  get(id: 'settings'): null | any {
    const v = globalThis.localStorage.getItem(id)
    if (v === null) return null
    return JSON.parse(v)
  }
}

export const localStorage = new LocalStorage()
