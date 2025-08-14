import { SemVer } from 'semver'

const env = import.meta.env
export const MODE = env.MODE as 'dev' | 'release'
// export const DEBUG = env.VITE_DEBUG
export const CREAGEN_EDITOR_VERSION = new SemVer(
  env.VITE_CREAGEN_EDITOR_VERSION,
)
export const VITE_CREAGEN_EDITOR_COMMIT_HASH =
  env.VITE_CREAGEN_EDITOR_COMMIT_HASH
export const CREAGEN_DEV_VERSION =
  typeof env.VITE_CREAGEN_DEV_VERSION === 'string'
    ? new SemVer(env.VITE_CREAGEN_DEV_VERSION)
    : null
