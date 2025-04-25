import React, {
  createContext,
  PropsWithChildren,
  useState,
  useEffect,
  useMemo,
  useContext,
} from 'react'
import { Settings, SettingsContextType } from './Settings'

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({
  settings,
  children,
}: { settings: Settings } & PropsWithChildren) {
  // Use state to trigger re-renders when settings change
  const [, setUpdateTrigger] = useState({})

  // Subscribe to settings changes
  useEffect(() => {
    // Force re-render when settings change
    return settings.subscribe(() => setUpdateTrigger({}))
  }, [settings])

  // Create the context value
  const contextValue = useMemo<SettingsContextType>(() => {
    return {
      values: settings.values,
      config: settings.config,
      set: (key, value) => settings.set(key, value),
      add: (key, entry) => settings.add(key, entry),
      remove: (key) => settings.remove(key),
    }
  }, [settings.values])

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
