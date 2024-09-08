interface ImportMetaEnv {
  readonly MODE: string
  readonly VITE_DEBUG: boolean
  readonly VITE_GENART_EDITOR_VERSION: string
  readonly VITE_GENART_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
