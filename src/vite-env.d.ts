interface ImportMetaEnv {
  readonly MODE: string
  readonly VITE_DEBUG: boolean
  readonly VITE_CREAGEN_EDITOR_VERSION: string
  readonly VITE_CREAGEN_DEV_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
