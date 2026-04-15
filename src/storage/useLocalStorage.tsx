import { useState, useEffect, useCallback } from 'react'
import { logger } from '../logs/logger'
import { localStorage } from './LocalStorage'
import type { LocalStorageOnlyKey, LocalStorageValue } from './StorageKey'
import { editorEvents } from '../events/events'

// Extend WindowEventMap to include 'local-storage' event
declare global {
  interface WindowEventMap {
    'local-storage': CustomEvent
  }
}

function isCustomEvent(
  event: Event,
): event is CustomEvent<{ value: unknown; key: string }> {
  if ('detail' in event && event instanceof CustomEvent) {
    if ('value' in event.detail && 'key' in event.detail) {
      return true
    }
  }
  return false
}

export function useLocalStorage<K extends LocalStorageOnlyKey>(
  key: K,
  initialValue: LocalStorageValue<K>,
): [LocalStorageValue<K>, (value: LocalStorageValue<K>) => void] {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.get(key)
      if (item !== null) return item
      return initialValue
    } catch (error) {
      logger.error(error)
      return initialValue
    }
  })

  const setValue = (value: LocalStorageValue<K>) => {
    try {
      setStoredValue(value)
      localStorage.set(key, value)
    } catch (error) {
      logger.error(error)
    }
  }

  const handleStorageChange = useCallback(
    (event: Event) => {
      if (event instanceof StorageEvent && event.key === key) {
        setStoredValue(
          event.newValue != null
            ? (JSON.parse(event.newValue) as LocalStorageValue<K>)
            : initialValue,
        )
      } else if (isCustomEvent(event) && event.detail.key === key) {
        setStoredValue(event.detail.value as LocalStorageValue<K>)
      }
    },
    [key, initialValue],
  )

  useEffect(() => {
    return editorEvents.on('local-storage', (e) => {
      if (e.key === key) {
        setStoredValue(e.value as LocalStorageValue<K>)
      }
    })
  }, [handleStorageChange, key])

  return [storedValue, setValue]
}
