import React from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

export function VCSView() {
  const creagenEditor = useCreagenEditor()
  return (
    <>
      {creagenEditor.vcs.refs?.getRefs().map((ref) => {
        return ref.name
      })}
    </>
  )
}
