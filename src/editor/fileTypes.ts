/**
 * Supported file types for the editor.
 *
 * The `id` doubles as the Monaco language id, so all entries must be
 * languages registered by the monaco imports in `Editor.ts` (typescript,
 * javascript, json, html, css, scss, less, markdown and plaintext).
 */
import { z } from 'zod'
export type FileType = 'typescript' | 'html'

export interface FileTypeInfo {
  id: FileType
  label: string
}

export const FILE_TYPES = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'html', label: 'HTML' },
] as const satisfies readonly FileTypeInfo[]

export const DEFAULT_FILE_TYPE: FileType = 'typescript'

export const fileTypeSchema = z.enum(FILE_TYPES.map((type) => type.id))

export function isFileType(value: unknown): value is FileType {
  return fileTypeSchema.safeParse(value).success
}
