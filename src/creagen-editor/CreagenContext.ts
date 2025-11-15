import { createContext, useContext } from 'react'
import { CreagenEditor } from './CreagenEditor'

export const CreagenEditorContext = createContext<CreagenEditor | null>(null)

export const useCreagenEditor = (): CreagenEditor => {
  const context = useContext(CreagenEditorContext)
  if (context === null) {
    throw new Error(
      'useCreagenEditor must be used within a CreagenEditorProvider and after editor initialization',
    )
  }
  return context
}
