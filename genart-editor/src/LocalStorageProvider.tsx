import React, { createContext, PropsWithChildren, useContext } from 'react'
import { Storage } from './storage'
import { BladeState } from '@tweakpane/core'

const LocalStorageContext = createContext<LocalStorage | null>(null)

export const LocalStorageProvider = ({ children }: PropsWithChildren) => {
  const localStorage = new LocalStorage()
  return (
    <LocalStorageContext.Provider value={localStorage}>
      {children}
    </LocalStorageContext.Provider>
  )
}

export const useLocalStorage = () => {
  const context = useContext(LocalStorageContext)
  if (!context) {
    throw new Error('not initialized')
  }
  return context
}

class LocalStorage {
  set(id: 'settings', item: BladeState) {
    localStorage.setItem(id, JSON.stringify(item))
  }

  get(id: 'settings'): BladeState | null {
    const v = localStorage.getItem(id)
    if (v === null) return null
    return JSON.parse(v)
  }
}
