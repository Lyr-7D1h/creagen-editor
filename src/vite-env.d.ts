// allow for css imports with bundler
declare module '*.css'

// Non optional build variables
declare const CREAGEN_MODE: 'dev' | 'release'
declare const CREAGEN_EDITOR_VERSION: string
/** trace: 0, debug: 1, info: 2, warning: 3, error: 4 */
declare const CREAGEN_LOG_LEVEL: number
declare const CREAGEN_EDITOR_COMMIT_HASH: string

declare const CREAGEN_DEV_VERSION: string | null
declare const CREAGEN_EDITOR_SANDBOX_RUNTIME_URL: string | null
declare const CREAGEN_EDITOR_CONTROLLER_URL: string | null
/** Url to a creagen compatible remote backend, if set stores most things there  */
declare const CREAGEN_REMOTE_URL: string | null
declare const CREAGEN_TURNSTILE_SITE_KEY: string | null
