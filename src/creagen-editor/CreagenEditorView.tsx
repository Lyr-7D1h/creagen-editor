import { Box, CircularProgress } from '@mui/material'
import { useEffect, useState } from 'react'
import { logger } from '../logs/logger'
import { Messages } from '../logs/Messages'
import { LoginPromptHandler } from '../user/LoginPromptHandler'
import { CreagenEditorContext } from './CreagenContext'
import { CreagenEditor } from './CreagenEditor'
import {
  CreagenEditorViewContentMobile,
  CreagenEditorViewSplit,
} from './CreagenEditorViewSplit'
import { ErrorBoundary } from './ErrorBoundary'
import { isMobile } from './isMobile'
import { Theme } from './Theme'
import { WelcomeScreen } from './WelcomeScreen'

declare global {
  interface Window {
    creagen: CreagenEditor
  }
}

export function CreagenEditorView() {
  const [creagenEditor, setCreagenEditor] = useState<CreagenEditor | null>(null)

  const [mobile, setMobile] = useState(isMobile())

  useEffect(() => {
    CreagenEditor.create()
      .then((creagenEditor) => {
        setCreagenEditor(creagenEditor)
        window.creagen = creagenEditor
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
    <CreagenEditorContext.Provider value={creagenEditor}>
      <Theme>
        <ErrorBoundary>
          <WelcomeScreen />
          {CREAGEN_REMOTE_URL != null && <LoginPromptHandler />}
          {mobile ? (
            <CreagenEditorViewContentMobile />
          ) : (
            <CreagenEditorViewSplit />
          )}
        </ErrorBoundary>
        <Messages />
      </Theme>
    </CreagenEditorContext.Provider>
  )
}
