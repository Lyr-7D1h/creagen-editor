import React, { createContext, useContext, useEffect, useState } from 'react'
import { CreagenEditorViewContent } from './CreagenEditorViewContent'
import { logger } from '../logs/logger'
import { CreagenEditor } from './CreagenEditor'
import { Logs } from '../logs/Logs'
import {
  Box,
  CircularProgress,
  createTheme,
  ThemeProvider,
} from '@mui/material'

const CreagenEditorContext = createContext<CreagenEditor>(null!)

const theme = createTheme({
  palette: {
    primary: {
      main: '#a9cbec',
    },
    secondary: {
      main: '#f6c3d0',
    },
  },
})

export const useCreagenEditor = (): CreagenEditor => {
  const context = useContext(CreagenEditorContext)
  if (context === null) {
    throw new Error(
      'useCreagenEditor must be used within a CreagenEditorProvider and after editor initialization',
    )
  }
  return context
}

export function CreagenEditorView() {
  const [creagenEditor, setCreagenEditor] = useState<CreagenEditor | null>(null)

  useEffect(() => {
    CreagenEditor.create()
      .then((creagenEditor) => {
        setCreagenEditor(creagenEditor)
      })
      .catch((e) => logger.error(e))
  }, [])

  if (creagenEditor === null) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
        <Logs />
      </Box>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CreagenEditorContext.Provider value={creagenEditor}>
        <CreagenEditorViewContent />
        <Logs />
      </CreagenEditorContext.Provider>
    </ThemeProvider>
  )
}
