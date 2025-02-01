import React, { createContext, PropsWithChildren, useContext } from 'react'
import { Storage } from './storage'

const LocalStorageContext = createContext<Storage | null>(null)

export const StorageProvider = ({
  children,
  storage,
}: PropsWithChildren & { storage: Storage }) => {
  return (
    <LocalStorageContext.Provider value={storage}>
      {children}
    </LocalStorageContext.Provider>
  )
}

export const useStorage = () => {
  const context = useContext(LocalStorageContext)
  if (!context) {
    throw new Error('not initialized')
  }
  return context
}
