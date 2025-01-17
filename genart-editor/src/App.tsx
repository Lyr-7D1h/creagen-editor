import React, { useState } from 'react'
import { Messages } from './components/Messages'
import { Editor } from './components/Editor'
import { Sandbox } from './components/Sandbox'
import { StorageProvider } from './StorageProvider'
import { LocalStorageProvider } from './LocalStorageProvider'
import { IndexDB } from './storage'
import { Settings } from './components/Settings'
import { SettingsProvider } from './SettingsProvider'
import { VerticalSplitResizer } from './components/VerticalSplitResizer'

export function App() {
  const [width] = useState(window.innerWidth / 4)
  const indexdb = new IndexDB()
  console.log(width)

  return (
    <LocalStorageProvider>
      <StorageProvider storage={indexdb}>
        <SettingsProvider>
          <Messages />
          <VerticalSplitResizer>
            <Editor height={'100vh'} />
            <Sandbox />
          </VerticalSplitResizer>
          <Settings />
        </SettingsProvider>
      </StorageProvider>
    </LocalStorageProvider>
  )
}
