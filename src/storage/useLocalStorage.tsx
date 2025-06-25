import { useState, useEffect, useCallback } from 'react'
import { logger } from '../logs/logger'
import { LocalStorageKey } from './LocalStorage'
import { localStorage } from './LocalStorage'

// Extend WindowEventMap to include 'local-storage' event
declare global {
  interface WindowEventMap {
    'local-storage': CustomEvent
  }
}

function isCustomEvent(
  event: Event,
): event is CustomEvent<{ value: any; key: string }> {
  if ('detail' in event && event instanceof CustomEvent) {
    if ('value' in event.detail && 'key' in event.detail) {
      return true
    }
  }
  return false
}

export function useLocalStorage(
  key: LocalStorageKey,
  initialValue?: string | number | Function | object | boolean,
) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.get(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      logger.error(error)
      return initialValue
    }
  })

  const setValue = (value: string | number | boolean | Function | object) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      localStorage.set(key, JSON.stringify(valueToStore))
      // Dispatch a custom event to notify other hooks
      // @TODO the event should only be for the localstorage key, now it triggers for all keys
      window.dispatchEvent(
        new CustomEvent('local-storage', {
          detail: { value: valueToStore, key },
        }),
      )
    } catch (error) {
      logger.error(error)
    }
  }

  const handleStorageChange = useCallback(
    (event: Event) => {
      if (event instanceof StorageEvent && event.key === key) {
        setStoredValue(
          event.newValue ? JSON.parse(event.newValue) : initialValue,
        )
      } else if (isCustomEvent(event) && event.detail.key === key) {
        setStoredValue(event.detail.value)
      }
    },
    [key, initialValue],
  )

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('local-storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage', handleStorageChange)
    }
  }, [handleStorageChange])

  return [storedValue, setValue]
}
