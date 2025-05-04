import { SemVer, valid, parse } from 'semver'
import { z } from 'zod'

export const semver = z
  .custom<SemVer>((data) => {
    if (typeof data === 'string') {
      return valid(data) !== null
    }
    return false
  })
  .transform((data) => {
    if (typeof data === 'string') {
      return parse(data) as SemVer
    }
    return data
  })
