import React from 'react'
import { Messages } from './components/Messages'
import { Editor } from './components/Editor'
import { VerticalSplitResizer } from './components/VerticalSplitResizer'
import { Sandbox } from './components/Sandbox'
import { StorageProvider } from './StorageProvider'
import { LocalStorageProvider } from './LocalStorageProvider'
import { IndexDB } from './storage'
import { Settings } from './components/Settings'
import { SettingsProvider } from './SettingsProvider'

export function App() {
  const indexdb = new IndexDB()

  return (
    <LocalStorageProvider>
      <StorageProvider storage={indexdb}>
        <SettingsProvider>
          <Messages />
          <main>
            <div id="view">
              <VerticalSplitResizer>
                <Editor height="100vh" />
                <Sandbox />
              </VerticalSplitResizer>
              <Settings />
            </div>
          </main>
        </SettingsProvider>
      </StorageProvider>
    </LocalStorageProvider>
  )
}
