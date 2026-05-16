import React from 'react'
import { createRoot } from 'react-dom/client'
import { CreagenEditorView } from './creagen-editor/CreagenEditorView'

const root = createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <CreagenEditorView />
  </React.StrictMode>,
)
