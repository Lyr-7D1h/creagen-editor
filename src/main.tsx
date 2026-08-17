import { createRoot } from 'react-dom/client'
import { CreagenEditorView } from './CreagenEditorView'

const root = createRoot(document.getElementById('root')!)

root.render(<CreagenEditorView
  config={{
        remoteUrl: CREAGEN_REMOTE_URL ?? undefined,
        sandboxRuntimeUrl: CREAGEN_EDITOR_SANDBOX_RUNTIME_URL,
        controllerUrl: CREAGEN_EDITOR_CONTROLLER_URL ?? undefined,
        turnstileSiteKey: CREAGEN_TURNSTILE_SITE_KEY ?? undefined
      }}
/>)
