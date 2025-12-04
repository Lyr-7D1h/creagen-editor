import { JS_EXTENSION, TYPESCRIPT_IMPORT_REGEX } from '../constants'
import { LIBRARY_CONFIGS } from '../creagen-editor/libraryConfigs'
import { Importer, PackageJson } from '../importer'
import { Path } from './path'
import { resolveExports } from './exportMapResolver'

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
  visisted: Set<string>,
  pkg?: PackageJson,
) {
  const id = path.toString()
  if (visisted.has(id)) return null
  visisted.add(id)

  const response = await fetch(
    new URL(rootUrl + '/' + path.toString()).toString(),
  )
  if (response.status !== 200) {
    return null
  }
  let typings = await response.text()

  const matches = [...typings.matchAll(TYPESCRIPT_IMPORT_REGEX)]

  if (path.filename()?.endsWith('.d.ts') ?? false) path = path.pop()
  const modules = await Promise.all(
    matches.map(async (match) => {
      const module = match.groups!['module']

      if (typeof module === 'undefined') {
        console.error('module path couldnt be parsed')
        return ''
      }

      if (isValidImportModule(module)) {
        const lib = await Importer.getLibrary(module)
        if (lib === null) return null
        return lib.typings()
      }

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

      return resolveImports(rootUrl, new Path(resolvedPath), visisted, pkg)
    }),
  )

  modules.forEach((module, i) => {
    if (module === null) return
    const match = matches[i]![0]
    if (typeof match === 'undefined') return
    typings = typings.replace(match, module)
  })
  // typings = filterExportStatements(typings)
  return typings
}

/** check if a module path is just the module name */
function isValidImportModule(modulePath: string) {
  if (modulePath.startsWith('.') || modulePath.includes('/')) return false

  return modulePath.split(' ')[0]?.match(/^[A-Za-z]+$/) !== null
}
