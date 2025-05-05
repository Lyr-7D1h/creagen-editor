import { SemVer, valid, parse } from 'semver'
import { z } from 'zod'

export const semverSchema = z
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

export const dateNumberSchema = z.number().transform((n) => new Date(n))
