import { SemVer } from 'semver'

const env = import.meta.env
export const MODE = env.MODE as 'dev' | 'release'
// export const DEBUG = env.VITE_DEBUG
export const CREAGEN_EDITOR_VERSION = new SemVer(
  env.VITE_CREAGEN_EDITOR_VERSION,
)
export const CREAGEN_DEV_VERSION =
  MODE === 'dev' ? new SemVer(env.VITE_CREAGEN_DEV_VERSION) : null
