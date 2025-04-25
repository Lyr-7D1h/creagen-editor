import React from 'react'
import { createRoot } from 'react-dom/client'
import { IndexDB } from './storage/storage'
import { CreagenEditorView } from './creagen-editor/CreagenEditorView'

const root = createRoot(document.getElementById('root')!)

const indexdb = new IndexDB()

root.render(<CreagenEditorView />)
