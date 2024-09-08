import { genartTypings } from '../genartTypings'
import { MODE } from './env'

/** Takes care of handling proper typings and importing libraries */
// TODO: use https://unpkg.com/
export class Importer {
  getLibrary(packageName: string, version: string) {
    if (packageName === 'genart' && MODE === 'dev') {
      return `declare module 'genart' {${genartTypings}}`
    }
    throw Error('Not implemented')
  }
}
