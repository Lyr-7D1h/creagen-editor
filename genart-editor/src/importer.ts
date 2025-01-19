import { GENART_VERSION, MODE } from './env'

export interface Library {
  name: string
  /** Specific version used ('{major}.{minor}.{patch}'), can't be latest or something else */
  version: string
  typings: () => Promise<string>
  /** Url, Absolute or relative path to library */
  importPath: string
}

/** Takes care of handling proper typings and importing libraries */
// TODO: use https://unpkg.com/
export class Importer {
  /** Get a library, latest if version is not given */
  static async getLibrary(
    packageName: string,
    version?: string,
  ): Promise<Library | null> {
    console.log('getLibrary', packageName, MODE)
    // get local version of genart
    if (
      (packageName === '@lyr_7d1h/genart' || packageName === 'genart') &&
      MODE === 'dev'
    ) {
      if (MODE === 'dev') {
        return {
          name: packageName,
          version: GENART_VERSION,
          importPath: './genart.js',
          typings: async () => {
            const res = await fetch('./genart.d.ts')
            const typings = await res.text()
            return `declare module '${packageName}' {${typings}}`
          },
        }
      }
    }

    const url = `https://unpkg.com/${packageName}${version ? `@${version}` : ''}`
    let res = await fetch(`${url}/package.json`)
    const pkg = await res.json()

    version = pkg.version
    if (typeof version === 'undefined') throw Error('No version found')

    const typings = pkg.typings
    if (typeof typings === 'undefined') throw Error('No typings found')

    return {
      name: packageName,
      version,
      importPath: `https://unpkg.com/${packageName}${version ? `@${version}` : ''}`,
      typings: async () => {
        res = await fetch(
          `https://unpkg.com/${packageName}${version ? `@${version}` : ''}/${typings}`,
        )
        let body = await res.text()
        return `declare module '${packageName}' {${body}}`
      },
    }
  }
}
