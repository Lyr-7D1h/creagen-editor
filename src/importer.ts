import { SemVer } from 'semver'
import { TYPESCRIPT_IMPORT_REGEX } from './constants'
import { CREAGEN_DEV_VERSION } from './env'
import { LIBRARY_CONFIGS } from './libraryConfigs'
import { Library } from './SettingsProvider'

export interface ImportPath {
  /** if `module` it is an es6 module otherwise main */
  type: 'main' | 'module'
  /** Url, Absolute or relative path to library */
  path: string
}

export interface LibraryImport extends Library {
  typings: () => Promise<string | null>
  importPath: ImportPath
}

const PACKAGE_SOURCE_URL = 'https://unpkg.com'

/** Takes care of handling proper typings and importing libraries */
// TODO: use https://unpkg.com/
export class Importer {
  /** Get a library, latest if version is not given */
  static async getLibrary(
    packageName: string,
    version?: SemVer,
  ): Promise<LibraryImport | null> {
    // get local version of creagen
    if (packageName === 'creagen' && CREAGEN_DEV_VERSION) {
      return {
        name: packageName,
        version: CREAGEN_DEV_VERSION,
        importPath: {
          type: 'module',
          path: `http://${window.location.host}/creagen.js`,
        },
        typings: async () => {
          const res = await fetch('./creagen.d.ts')
          const typings = await res.text()
          return `declare module '${packageName}' {${typings}}`
        },
      }
    }

    const url = `${PACKAGE_SOURCE_URL}/${packageName}${version ? `@${version}` : ''}`
    let res = await fetch(`${url}/package.json`)
    const pkg = await res.json()

    version = pkg.version
    if (typeof version === 'undefined') throw Error('No version found')

    let typingsUrlRoot = `${PACKAGE_SOURCE_URL}/${packageName}${version ? `@${version}` : ''}`
    let pkgTypings = pkg.typings || pkg.types
    if (typeof pkgTypings === 'undefined') {
      // if no typings are found, try to get the @types package
      typingsUrlRoot = `${PACKAGE_SOURCE_URL}/@types/${packageName}`
      let res = await fetch(`${typingsUrlRoot}/package.json`)
      const pkg = await res.json()
      pkgTypings = pkg.typings || pkg.types

      if (LIBRARY_CONFIGS[packageName]?.typingsOverwrite)
        pkgTypings = LIBRARY_CONFIGS[packageName].typingsOverwrite

      if (pkgTypings === null) throw Error('No typings found')
    }
    const typings = async () =>
      getTypings(packageName, typingsUrlRoot, pkgTypings)

    let importPath: ImportPath = {
      type: 'main',
      path: `${PACKAGE_SOURCE_URL}/${packageName}${version ? `@${version}` : ''}/${pkg.main}`,
    }
    if (pkg.module) {
      importPath.type = 'module'
      importPath.path = `${PACKAGE_SOURCE_URL}/${packageName}${version ? `@${version}` : ''}/${pkg.module}`
    }
    return {
      name: packageName,
      version: new SemVer(version),
      importPath,
      typings,
    }
  }

  /** return a list of all the versions of a package from latest to oldest */
  static async versions(packageName: string) {
    const url = `https://registry.npmjs.org/${packageName}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch data for package: ${packageName}`)
    }
    const data = await response.json()
    const versions = Object.keys(data.versions)
    versions.reverse()
    return versions
  }
}

async function getTypings(packageName: string, root: string, typeFile: string) {
  const typings = await resolveImports(root, typeFile)
  if (typings === null) return null
  return `declare module '${packageName}' {${typings}}`
}

/** Parse and resolve imports into a single string */
async function resolveImports(root: string, typeFile: string) {
  const response = await fetch(root + '/' + typeFile)
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
      if (isImportedModule(module)) {
        const lib = await Importer.getLibrary(module)
        if (lib === null) return null
        return lib.typings()
      }
      const parts = module.split('/')
      let parent = parts.splice(0, parts.length - 1).join('/')
      if (parent === '.') parent = ''
      return resolveImports(`${root}/${parent}`, module + '.d.ts')
    }),
  )

  modules.forEach((module, i) => {
    if (module === null) return
    const match = matches[i]![0]
    if (typeof match === 'undefined') return
    typings = typings.replace(match, module)
  })
  // ignore exports
  typings = typings.replace(/export .*/g, '')

  return typings
}

/** check if a path is */
function isImportedModule(modulePath: string) {
  if (modulePath.startsWith('.') || modulePath.includes('/')) return false

  return modulePath.split(' ')[0]?.match(/^[A-Za-z]+$/) !== null
}
