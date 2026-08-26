import { Box } from '@mui/material'
import { useEffect, useState } from 'react'
import { logger } from './logs/logger'
import { Messages } from './logs/Messages'
import { CreagenEditorContext } from './creagen-editor/CreagenContext'
import type { CreagenEditorConfig } from './creagen-editor/CreagenEditor';
import { CreagenEditor } from './creagen-editor/CreagenEditor'
import {
  CreagenEditorViewContentMobile,
  CreagenEditorViewSplit,
} from './creagen-editor/CreagenEditorViewSplit'
import { ErrorBoundary } from './creagen-editor/ErrorBoundary'
import { isMobile } from './creagen-editor/isMobile'
import { Theme } from './creagen-editor/Theme'
import { WelcomeScreen } from './creagen-editor/WelcomeScreen'
import { LoginPromptHandler } from './user/LoginPromptHandler'

declare global {
  interface Window {
    creagen: CreagenEditor
  }
}

export function LoadingScreen() {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Box component="img" src="/loading.webp" alt="Loading" />
        <Messages />
      </Box>)
}


export function CreagenEditorView({ config }: {
  /** Initial config used for setting up the creagen editor */
  config: CreagenEditorConfig
}) {
  const [creagenEditor, setCreagenEditor] = useState<CreagenEditor | null>(null)

  const [mobile, setMobile] = useState(isMobile())

  useEffect(() => {
    CreagenEditor.create(config)
      .then((creagenEditor) => {
        setCreagenEditor(creagenEditor)
        window.creagen = creagenEditor
      })
      .catch((e) => logger.error(e))
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (creagenEditor === null) return <LoadingScreen />

  return (
      <CreagenEditorContext.Provider value={creagenEditor}>
        <Theme>
          <ErrorBoundary>
            <LoginPromptHandler />
            <WelcomeScreen />
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
