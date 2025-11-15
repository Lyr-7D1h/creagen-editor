import React, { useEffect, useState } from 'react'
import {
  CreagenEditorViewSplit,
  CreagenEditorViewContentMobile,
} from './CreagenEditorViewSplit'
import { logger } from '../logs/logger'
import { CreagenEditor } from './CreagenEditor'
import { Messages } from '../logs/Messages'
import { Box, CircularProgress } from '@mui/material'
import { WelcomeScreen } from './WelcomeScreen'
import { ErrorBoundary } from './ErrorBoundary'
import { isMobile } from './isMobile'
import { CreagenEditorContext } from './CreagenContext'

export function CreagenEditorView() {
  const [creagenEditor, setCreagenEditor] = useState<CreagenEditor | null>(null)

  const [mobile, setMobile] = useState(isMobile())

  useEffect(() => {
    CreagenEditor.create()
      .then((creagenEditor) => {
        setCreagenEditor(creagenEditor)
      })
      .catch((e) => logger.error(e))
  }, [])

  // on window resize check to enable mobile version or not
  useEffect(() => {
    if (creagenEditor === null) return
    const checkScreenSize = () => {
      if (isMobile()) {
        setMobile(true)
      } else {
        setMobile(false)
      }
    }
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [creagenEditor])

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
        <Messages />
      </Box>
    )
  }

  return (
    // <ThemeProvider theme={theme}>
    <CreagenEditorContext.Provider value={creagenEditor}>
      <ErrorBoundary>
        <WelcomeScreen />
        {mobile ? (
          <CreagenEditorViewContentMobile />
        ) : (
          <CreagenEditorViewSplit />
        )}
      </ErrorBoundary>
      <Messages />
    </CreagenEditorContext.Provider>
    // </ThemeProvider>
  )
}
