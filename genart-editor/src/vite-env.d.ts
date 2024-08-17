interface ImportMetaEnv {
  readonly VITE_CONTROLLER_URL: string
  readonly VITE_SYNC_SERVER_URL: string
  readonly VITE_DEBUG_INFO: string
  readonly VITE_ASSERTS: string
  readonly VITE_DEBUG_VISUAL: string
  readonly VITE_CONSTANT_TIME_S: string
  readonly VITE_COUNT_START_CREATURES: string
  readonly VITE_QR: string
  readonly VITE_PING_TIMEOUT: number
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
