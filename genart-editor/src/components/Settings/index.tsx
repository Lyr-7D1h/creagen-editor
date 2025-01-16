import React from 'react'
import { useSettings } from '../../SettingsProvider'

export function Settings() {
  const settings = useSettings()

  const Entries = Object.entries(settings.config).map(([key, entry]) => {
    switch (entry.type) {
      case 'folder':
        return <div key={key} id={key}></div>
      case 'param': {
        return (
          <div key={key} id={key}>
            {key}
          </div>
        )
      }
      // case 'button': {
      //   return <button key={key}>{entry.title}</button>
    }
  })

  return <div id="settings">{Entries}</div>
}
