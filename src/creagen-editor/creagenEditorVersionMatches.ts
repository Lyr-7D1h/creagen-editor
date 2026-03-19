import { SemVer } from 'semver'
import { logger } from '../logs/logger'

/**
 * Check if a version matches editor version
 *
 * will log a warning if they do not match
 * */
export function creagenEditorVersionMismatch(version: SemVer): boolean {
  const v = version.major !== new SemVer(CREAGEN_EDITOR_VERSION).major
  if (v) logger.warn("Editor version doesn't match")
  return v
}
