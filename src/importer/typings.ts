import * as monaco from 'monaco-editor'
import { JS_EXTENSION, TYPESCRIPT_IMPORT_REGEX } from '../constants'
import { LIBRARY_CONFIGS } from '../creagen-editor/libraryConfigs'
import type { PackageJson } from '../importer'
import { Importer } from '../importer'
import { logger } from '../logs/logger'
import { getTypeScriptWorker } from '../workers/getTypeScriptWorker'
import { resolveExports } from './exportMapResolver'
import { Path } from './path'

export async function getTypings(rootUrl: string, pkg: PackageJson) {
  const typingsFilePath =
    LIBRARY_CONFIGS[pkg.name]?.typingsPathOverwrite ?? pkg.typings ?? pkg.types

  const isTypePackage = pkg.name.startsWith('@types/')

  const typingsOverwrite = LIBRARY_CONFIGS[pkg.name]?.typingsOverwrite
  if (
    (typeof typingsFilePath === 'undefined' && !isTypePackage) ||
    typeof typingsOverwrite !== 'undefined'
  ) {
    const typePackage = await Importer.getLibrary(
      typingsOverwrite ?? `@types/${pkg.name}`,
    )
    if (typePackage === null) return null
    return typePackage.typings()
  }

  if (typeof typingsFilePath === 'undefined') {
    console.error('No typings found for package', pkg.name)
    return null
  }

  const typings = await resolveImports(
    rootUrl,
    new Path('/' + typingsFilePath),
    new Set(),
    pkg,
  )
  if (typings === null) return null
  const module = isTypePackage ? pkg.name.replace('@types/', '') : pkg.name
  return `declare module '${module}' {${typings}}`
}

/**
 * Parse and resolve imports into a single string
 * @param rootUrl root path of the file without trailing slash
 * @param path path to the file to resolve imports
 * @param pkg optional package.json for resolving exports field
 */
async function resolveImports(
  rootUrl: string,
  path: Path,
  visited: Set<string>,
  pkg?: PackageJson,
) {
  const id = path.toString()
  if (visited.has(id)) return null
  visited.add(id)

  const response = await fetch(
    new URL(rootUrl + '/' + path.toString()).toString(),
  )
  if (response.status !== 200) {
    return null
  }
  let typings = await response.text()

  // Extract imports using TypeScript worker if available, otherwise regex
  const fileName = `file:///${pkg?.name || 'package'}${path.toString()}`
  const importStatements = await extractImports(fileName, typings)

  if (path.filename()?.endsWith('.d.ts') ?? false) path = path.pop()
  // set of resolved modules
  const modules = (await Promise.all(
    // deduplicate modules from statements
    new Set(importStatements.map((mod) => mod.module))
      .values()
      .map(async (module) => {
        // Try to resolve using exports field if available
        let resolvedPath: string | null = null
        if (typeof pkg?.exports !== 'undefined') {
          resolvedPath = resolveExports(pkg.exports, module, [
            'types',
            'import',
            'default',
          ])
          if (resolvedPath !== null) {
            // Convert to .d.ts path
            resolvedPath = resolvedPath.replace(JS_EXTENSION, '.d.ts')
          }
        }

        // Fall back to relative path resolution
        if (resolvedPath === null) {
          resolvedPath = path
            .join(module.replace(JS_EXTENSION, '') + '.d.ts')
            .toString()
        } else {
          resolvedPath = new Path('/' + resolvedPath).toString()
        }

        const resolved = await resolveImports(
          rootUrl,
          new Path(resolvedPath),
          visited,
          pkg,
        )
        return [module, resolved]
      }),
  )) as [string, string | null][]

  // Replace import statements with resolved content
  // Process in reverse order to maintain correct string positions
  const sortedImports = [...importStatements].sort((a, b) => b.start - a.start)

  sortedImports.forEach((importStatement) => {
    const resolvedModule = modules.find(
      ([module]) => module === importStatement.module,
    )
    if (!resolvedModule) return
    const resolution = resolvedModule[1]
    if (!resolution) return

    // Replace using the text range from the worker
    typings =
      typings.slice(0, importStatement.start) +
      resolution +
      typings.slice(importStatement.end)
  })

  return typings
}

/**
 * Extract import statements from TypeScript code
 * Uses the TypeScript worker if available, falls back to regex
 *
 * @param fileName - URI string (e.g., 'file:///package/index.d.ts') - must match the model URI
 * @param content - The TypeScript/JavaScript source code to parse
 * @returns Array of import details with module name and text range
 */
async function extractImports(
  fileName: string,
  content: string,
): Promise<Array<{ module: string; start: number; end: number }>> {
  try {
    // Try to use TypeScript worker for accurate parsing
    // The worker needs a Monaco model to analyze the file
    // Monaco's TypeScript language service operates on models, not raw strings
    const uri = monaco.Uri.parse(fileName)
    let model = monaco.editor.getModel(uri)
    const shouldCleanup = !model

    if (!model) {
      // Create a temporary model so the worker can analyze it
      // The model registers itself with Monaco's language service
      model = monaco.editor.createModel(content, 'typescript', uri)
    }

    try {
      // Get worker for this specific URI - this ensures the worker is synced with the model
      const worker = await getTypeScriptWorker(uri)
      // The fileName must match the model's URI for the worker to find it
      const imports = await worker.getModuleImports(fileName)
      return imports
    } finally {
      // Clean up temporary model to avoid memory leaks
      if (shouldCleanup && model) {
        model.dispose()
      }
    }
  } catch (e) {
    logger.warn(
      `Failed to use typescript lsp for extracting type imports on ${fileName}: `,
      e,
    )
    // Fallback to regex parsing if worker is unavailable
    // This happens during initial load or if TypeScript language isn't registered yet
    const matches = [...content.matchAll(TYPESCRIPT_IMPORT_REGEX)]
    return matches
      .map((match) => {
        const module = match.groups?.['module']
        if (!module || match.index === undefined) return null
        return {
          module,
          start: match.index,
          end: match.index + match[0].length,
        }
      })
      .filter(
        (m): m is { module: string; start: number; end: number } => m !== null,
      )
  }
}
