import React from 'react'
import { CreagenEditor } from './creagen-editor/CreagenEditor'
import { createRoot } from 'react-dom/client'
import { SettingsProvider } from './settings/SettingsProvider'
import { StorageProvider } from './storage/StorageProvider'
import { IndexDB } from './storage/storage'

const root = createRoot(document.getElementById('root')!)

const indexdb = new IndexDB()

root.render(
  <StorageProvider storage={indexdb}>
    <SettingsProvider>
      <CreagenEditor />
    </SettingsProvider>
  </StorageProvider>,
)
