import ts from 'typescript'
import { typescriptCompilerOptions } from './editor/Editor'
import { TYPESCRIPT_IMPORT_REGEX } from '../constants'
import { LibraryImport } from './importer'
import { logger } from '../logs/logger'

/** Parse code to make it compatible for the editor */
export function parseCode(
  code: string,
  libraries: Record<string, LibraryImport>,
) {
  code = resolveImports(code, libraries)
  if (libraries['p5']) code = makeP5FunctionsGlobal(code)

  return ts.transpile(code, typescriptCompilerOptions)
}

function resolveImports(
  code: string,
  libraries: Record<string, LibraryImport>,
) {
  let match
  while ((match = TYPESCRIPT_IMPORT_REGEX.exec(code)) !== null) {
    const imports = match.groups!['imports']
    const module = match.groups!['module']
    if (typeof module === 'undefined') continue

    // Replace the module path while leaving the imports intact
    const newModulePath = libraries[module]?.importPath.path
    if (typeof newModulePath === 'undefined') {
      logger.error(`Library ${module} not found`)
      continue
    }
    const updatedImport = imports
      ? `import ${imports} from '${newModulePath}';`
      : `import '${newModulePath}';`

    code = code.replace(match[0], updatedImport)
  }
  return code
}

function makeP5FunctionsGlobal(code: string) {
  // globally defined functions
  const userDefinedFunctions = [
    'setup',
    'draw',
    'mousePressed',
    'mouseReleased',
    'mouseClicked',
    'mouseMoved',
    'mouseDragged',
    'mouseWheel',
    'keyPressed',
    'keyReleased',
    'keyTyped',
    'touchStarted',
    'touchMoved',
    'touchEnded',
    'windowResized',
    'preload',
    'remove',
    'deviceMoved',
    'deviceTurned',
    'deviceShaken',
  ]

  const functionRegex = new RegExp(
    `\\b(${userDefinedFunctions.join('|')})\\b\\s*\\(`,
    'g',
  )

  // Find all matches of the defined functions
  let matches
  const definedFunctions = new Set()
  while ((matches = functionRegex.exec(code)) !== null) {
    definedFunctions.add(matches[1])
  }

  // Append window.{functionName} = {functionName} for each detected function
  const globalCode = Array.from(definedFunctions)
    .map((fn) => `window.${fn} = ${fn};`)
    .join('\n')

  // Add the global code to the original code
  return code + '\n\n' + globalCode
}
