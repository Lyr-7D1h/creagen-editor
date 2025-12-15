import { fetch } from '../fetch'
import { SemVer } from 'semver'
import { z } from 'zod'
import { getTypings } from './typings'
import { semverSchema } from '../creagen-editor/schemaUtils'
import { Library } from '../settings/SettingsConfig'
import { ExportsField, buildImportPaths } from './exportMapResolver'

export type ImportPath = {
  /**
   * if `module` it is an es6 module otherwise main
   *
   * main modules we want to load in a seperate script
   * */
  type: 'main' | 'module'
  /** Url, Absolute or relative path to library */
  path: string
}

export interface LibraryImport extends Library {
  typings: () => Promise<string | null>
  /** Preload libraries with a single script to optimize loading speed */
  preload?: ImportPath[]
  /**
   * Map for each import statement to the path or url it should be pointing to
   *
   * akin to https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap
   *
   * [matching statement, map to path]
   * */
  importMap: [string, string | ((relativePath: string) => string)][]
}

const versionResponseSchema = z.object({
  versions: z.record(z.string(), z.unknown()),
})

const packageJsonSchema = z.object({
  name: z.string(),
  version: semverSchema,
  types: z.string().optional(),
  typings: z.string().optional(),
  module: z.string().optional(),
  main: z.string().optional(),
  browser: z.string().optional(),
  exports: z.unknown().optional(), // Will be typed as ExportsField after parsing
})
export type PackageJson = z.infer<typeof packageJsonSchema> & {
  exports?: ExportsField
}

const SUPPORTED_CDN = {
  /**
   * JSDeliver
   * NOTE: supports +esm after an import to resolve all relative imports in file making it a standalone script
   * PERF: add a way to resolve inner import and exports when importing things from cdn to prevent duplication
   * */
  jsdelivr: 'https://cdn.jsdelivr.net/npm',
  unpkg: 'https://unpkg.com',
}
type SupportedCDN = keyof typeof SUPPORTED_CDN

/** Takes care of handling proper typings and importing libraries */
export class Importer {
  /** Get a library, latest if version is not given */
  static async getLibrary(
    packageName: string,
    version?: SemVer,
  ): Promise<LibraryImport | null> {
    try {
      const res = await getLibraryFromSource('jsdelivr', packageName, version)
      return res
    } catch (e) {
      const error = e as Error
      if (error.name === 'TimeoutError')
        return getLibraryFromSource('unpkg', packageName, version)
      throw e
    }
  }

  /** return a list of all the versions of a package from latest to oldest */
  static async versions(packageName: string) {
    if (packageName === 'creagen' && CREAGEN_DEV_VERSION)
      return [CREAGEN_DEV_VERSION.toString()]
    const url = `https://registry.npmjs.org/${packageName}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch data for package: ${packageName}`)
    }
    const data = await versionResponseSchema.parseAsync(await response.json())
    const versions = Object.keys(data.versions)
    versions.reverse()
    return versions
  }
}

/** Get a library, latest if version is not given */
async function getLibraryFromSource(
  source: SupportedCDN,
  packageName: string,
  version?: SemVer,
): Promise<LibraryImport | null> {
  // get local version of creagen
  if (packageName === 'creagen' && CREAGEN_DEV_VERSION) {
    return {
      name: packageName,
      version: new SemVer(CREAGEN_DEV_VERSION),
      importMap: [['creagen', `http://${window.location.host}/creagen.js`]],
      typings: async () => {
        const res = await fetch('./creagen.d.ts', { timeout: 2000 })
        const typings = await res.text()
        return `declare module '${packageName}' {${typings}}`
      },
    }
  }

  const url = `${SUPPORTED_CDN[source]}/${packageName}${version ? `@${version.toString()}` : ''}`
  // HACK: unpkg does not send cors headers for error reponses
  const res = await fetch(`${url}/package.json`, {
    validate: false,
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} ${res.status} - ${res.statusText}`)
  }
  const pkg = (await packageJsonSchema.parseAsync(
    await res.json(),
  )) as PackageJson

  const typings = async () => getTypings(url, pkg)

  const maps = buildImportPaths(packageName, url, pkg)

  const libraryImport: LibraryImport = {
    name: packageName,
    version: pkg.version,
    ...maps,
    typings,
  }

  if (source === 'jsdelivr') {
    libraryImport.importMap = maps.importMap.map(([m, path]) => [
      m,
      (relPath: string) => path + relPath + '/+esm',
    ])
    if (libraryImport.preload)
      libraryImport.preload.forEach((m) => (m.path += '/+esm'))
  }
  return libraryImport
}
