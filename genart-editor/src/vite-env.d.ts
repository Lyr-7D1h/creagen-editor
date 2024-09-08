interface ImportMetaEnv {
  readonly MODE: string
  readonly VITE_DEBUG: boolean
  readonly GENART_EDITOR_VERSION: string
  readonly GENART_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
