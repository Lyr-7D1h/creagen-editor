import { GENART_VERSION, MODE } from './env'

export interface Library {
  name: string
  /** Specific version used ('{major}.{minor}.{patch}'), can't be latest or something else */
  version: string
  typings: () => Promise<string>
  /** Absolute or relative path to library */
  importPath: string
}

/** Takes care of handling proper typings and importing libraries */
// TODO: use https://unpkg.com/
export class Importer {
  /** Get a library, latest if version is not given */
  getLibrary(packageName: string, version?: string): Library {
    console.log('getLibrary', packageName, MODE)
    // get local version of genart
    if (packageName === 'genart' && MODE === 'dev') {
      return {
        name: packageName,
        version: GENART_VERSION,
        importPath: './genart.js',
        typings: async () => {
          const res = await fetch('./genart.d.ts')
          const typings = await res.text()
          return `declare module 'genart' {${typings}}`
        },
      }
    }
    throw Error('Not implemented')
  }
}
