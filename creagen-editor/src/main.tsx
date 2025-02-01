import React from 'react'
import { App } from './App'
import { createRoot } from 'react-dom/client'
import { SettingsProvider } from './SettingsProvider'
import { StorageProvider } from './StorageProvider'
import { IndexDB } from './storage'

const root = createRoot(document.getElementById('root')!)

const indexdb = new IndexDB()

root.render(
  <StorageProvider storage={indexdb}>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StorageProvider>,
)
