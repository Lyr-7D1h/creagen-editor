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
  /** Which libraries to preload before using them */
  preload?: ImportPath[]
  /**
   * Map for each import statement to the path it should be pointing to
   *
   * akin to https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap
   * */
  importMap: [string, string][]
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

/** Takes care of handling proper typings and importing libraries */
export class Importer {
  /** Get a library, latest if version is not given */
  static async getLibrary(
    packageName: string,
    version?: SemVer,
  ): Promise<LibraryImport | null> {
    try {
      const res = await getLibraryFromSource(
        'https://unpkg.com',
        packageName,
        version,
      )
      return res
    } catch (e) {
      const error = e as Error
      if (error.name === 'TimeoutError')
        return getLibraryFromSource(
          'https://cdn.jsdelivr.net/npm',
          packageName,
          version,
        )
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
  packageSourceUrl: string,
  packageName: string,
  version?: SemVer,
): Promise<LibraryImport | null> {
  // get local version of creagen
  if (packageName === 'creagen' && CREAGEN_DEV_VERSION) {
    return {
      name: packageName,
      version: new SemVer(CREAGEN_DEV_VERSION),
      importMap: [['creagen', `http://${window.location.host}/creagen.mjs`]],
      typings: async () => {
        const res = await fetch('./creagen.d.ts', { timeout: 2000 })
        const typings = await res.text()
        return `declare module '${packageName}' {${typings}}`
      },
    }
  }

  const url = `${packageSourceUrl}/${packageName}${version ? `@${version.toString()}` : ''}`
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

  return {
    name: packageName,
    version: pkg.version,
    ...maps,
    typings,
  }
}
