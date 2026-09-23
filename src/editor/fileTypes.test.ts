import { describe, expect, test } from 'vitest'
import {
  DEFAULT_FILE_TYPE,
  FILE_TYPES,
  isFileType,
  type FileType,
} from './fileTypes'

describe('fileTypes', () => {
  test('default file type is typescript and included in the list', () => {
    expect(DEFAULT_FILE_TYPE).toBe('typescript')
    expect(FILE_TYPES.some((type) => type.id === DEFAULT_FILE_TYPE)).toBe(true)
  })

  test('ids are unique', () => {
    const ids = FILE_TYPES.map((type) => type.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('isFileType accepts every listed id', () => {
    for (const type of FILE_TYPES) {
      expect(isFileType(type.id)).toBe(true)
    }
  })

  test('isFileType rejects unknown values', () => {
    for (const value of ['python', 'plaintexty', 42, null, undefined]) {
      expect(isFileType(value)).toBe(false)
    }
  })

  test('isFileType narrows to FileType', () => {
    const unknown: unknown = 'json'
    if (isFileType(unknown)) {
      const type: FileType = unknown
      expect(type).toBe('json')
    }
  })
})
