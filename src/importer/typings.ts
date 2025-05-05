import { TYPESCRIPT_IMPORT_REGEX } from '../constants'
import { LIBRARY_CONFIGS } from '../creagen-editor/libraryConfigs'
import { Importer, PackageJson } from '../importer'

export async function getTypings(rootUrl: string, pkg: PackageJson) {
  const typingsFilePath =
    LIBRARY_CONFIGS[pkg.name]?.typingsPathOverwrite || pkg.typings || pkg.types

  const typingsOverwrite = LIBRARY_CONFIGS[pkg.name]?.typingsOverwrite
  if (
    (typeof typingsFilePath === 'undefined' &&
      !pkg.name.startsWith('@types/')) ||
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

  const typings = await resolveImports(rootUrl, typingsFilePath)
  if (typings === null) return null
  return `declare module '${pkg.name}' {${typings}}`
}

/**
 * Parse and resolve imports into a single string
 * @param root root path of the file without trailing slash
 * @param typeFile path to the file to resolve imports
 */
async function resolveImports(root: string, typeFile: string) {
  const response = await fetch(new URL(typeFile, root + '/').toString())
  if (response.status !== 200) {
    return null
  }
  let typings = await response.text()

  const matches = [...typings.matchAll(TYPESCRIPT_IMPORT_REGEX)]
  if (matches === null) return typings

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

      const parts = module.split('/')
      let parent = parts.splice(0, parts.length - 1).join('/')
      if (parent === '.') parent = ''
      if (parent.length > 0) parent = '/' + parent

      return resolveImports(`${root}${parent}`, module + '.d.ts')
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
