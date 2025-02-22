const env = import.meta.env
export const MODE = env.MODE as 'dev' | 'release'
// export const DEBUG = env.VITE_DEBUG
export const CREAGEN_EDITOR_VERSION = env.VITE_CREAGEN_EDITOR_VERSION
export const CREAGEN_DEV_VERSION = env.VITE_CREAGEN_DEV_VERSION
