import type { FileType } from '../../editor/fileTypes'
import type { LibraryImport } from '../../importer'
import type { Params } from '../../params/Params'
import { parseHtml } from './parseHtml'
import { parseTypescript } from './parseTypescript'

/**
 * Parse code to make it compatible for the editor
 * Uses text replacement for useParam calls, then AST transformation for imports
 */
export function parseCode(
  fileType: FileType,
  code: string,
  libraries: Map<string, LibraryImport>,
  params: Params,
): string {
  switch (fileType) {
    case 'html':
      return parseHtml(code, libraries, params)
    case 'typescript':
      return parseTypescript(code, libraries, params)
  }
}
