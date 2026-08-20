import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { CreagenEditorConfig } from './creagen-editor/CreagenEditor'
import { CreagenEditorView, LoadingScreen } from './CreagenEditorView'
import { logger } from './logs/logger'
import { remoteClient } from './remote/remoteClient'
import { LocalClientStorage } from './storage/LocalClientStorage'
import { RemoteClientStorage } from './storage/RemoteClientStorage'
import './styles.css'

const root = createRoot(document.getElementById('root')!)

export function App() {
  const [config, setConfig] = useState<CreagenEditorConfig | null>(null)

  useEffect(() => {
    if (!CREAGEN_EDITOR_SANDBOX_RUNTIME_URL) throw Error("CREAGEN_EDITOR_SANDBOX_RUNTIME_URL is not defined")
    ;(CREAGEN_REMOTE_URL
      ? RemoteClientStorage.create(remoteClient(CREAGEN_REMOTE_URL))
      : LocalClientStorage.create()
    )
      .then((clientStorage) => {
        setConfig({
          clientStorage,
          sandboxRuntimeUrl: CREAGEN_EDITOR_SANDBOX_RUNTIME_URL,
          controllerUrl: CREAGEN_EDITOR_CONTROLLER_URL ?? undefined,
          turnstileSiteKey: CREAGEN_TURNSTILE_SITE_KEY ?? undefined,
        })
      })
      .catch((e) => logger.error(e))
  }, [])

  if (config === null) return <LoadingScreen />

  return <CreagenEditorView config={config} />
}

root.render(<App />)
