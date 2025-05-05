import { fetch } from '../../fetch'
import { SemVer } from 'semver'
import { z } from 'zod'
import { CREAGEN_DEV_VERSION } from '../../env'
import { Library } from '../../settings/SettingsConfig'
import { semver } from '../schemaUtils'
import { getTypings } from './typings'

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

const packageJsonSchema = z.object({
  name: z.string(),
  version: semver,
  types: z.string().optional(),
  typings: z.string().optional(),
  module: z.string().optional(),
  main: z.string().optional(),
  browser: z.string().optional(),
})
export type PackageJson = z.infer<typeof packageJsonSchema>

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
      let error = e as Error
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
      version: CREAGEN_DEV_VERSION,
      importPath: {
        type: 'module',
        path: `http://${window.location.host}/creagen.js`,
      },
      typings: async () => {
        const res = await fetch('./creagen.d.ts', { timeout: 2000 })
        const typings = await res.text()
        return `declare module '${packageName}' {${typings}}`
      },
    }
  }

  const url = `${packageSourceUrl}/${packageName}${version ? `@${version}` : ''}`
  // HACK: unpkg does not send cors headers for error reponses
  let res = await fetch(`${url}/package.json`, {
    validate: false,
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} ${res.status} - ${res.statusText}`)
  }
  const pkg = await packageJsonSchema.parseAsync(await res.json())

  const typings = async () => getTypings(url, pkg)

  let importPath: ImportPath = {
    type: 'main',
    path: `${packageSourceUrl}/${packageName}${version ? `@${version}` : ''}/${pkg.main || pkg.browser}`,
  }
  if (pkg.module) {
    importPath.type = 'module'
    importPath.path = `${packageSourceUrl}/${packageName}${version ? `@${version}` : ''}/${pkg.module}`
  }
  return {
    name: packageName,
    version: pkg.version,
    importPath,
    typings,
  }
}

// function filterExportStatements(typings: string): string {
//   const sourceFile = ts.createSourceFile(
//     'temp.d.ts',
//     typings,
//     ts.ScriptTarget.Latest,
//     true,
//   )

//   // Create a transformer factory to handle exports
//   const transformerFactory: ts.TransformerFactory<ts.SourceFile> = (
//     context,
//   ) => {
//     return (sourceFile) => {
//       // Visitor function that removes export keywords but keeps declarations
//       const visitor: ts.Visitor = (node) => {
//         // If this is an exported declaration, return the declaration without the export keyword
//         if (ts.isExportDeclaration(node)) {
//           // Skip this node altogether (removes export ... from statements)
//           return undefined
//         }

//         // If this node has the export modifier, return a new node without that modifier
//         if (
//           ts.canHaveModifiers(node) &&
//           ts
//             .getModifiers(node)
//             ?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
//         ) {
//           // Create a new node without the export modifier
//           const oldModifiers = ts.getModifiers(node) || []
//           const newModifiers = oldModifiers.filter(
//             (mod) => mod.kind !== ts.SyntaxKind.ExportKeyword,
//           )

//           // Clone the node with the new modifiers
//           // We need to use the appropriate update method based on node kind
//           const newNode = ts.visitEachChild(node, visitor, context)
//           if (ts.isVariableStatement(newNode)) {
//             return ts.factory.updateVariableStatement(
//               newNode,
//               newModifiers.length > 0 ? newModifiers : undefined,
//               newNode.declarationList,
//             )
//           } else if (ts.isFunctionDeclaration(newNode)) {
//             return ts.factory.updateFunctionDeclaration(
//               newNode,
//               newModifiers.length > 0 ? newModifiers : undefined,
//               newNode.asteriskToken,
//               newNode.name,
//               newNode.typeParameters,
//               newNode.parameters,
//               newNode.type,
//               newNode.body,
//             )
//           } else if (ts.isClassDeclaration(newNode)) {
//             return ts.factory.updateClassDeclaration(
//               newNode,
//               newModifiers.length > 0 ? newModifiers : undefined,
//               newNode.name,
//               newNode.typeParameters,
//               newNode.heritageClauses,
//               newNode.members,
//             )
//           } else if (ts.isInterfaceDeclaration(newNode)) {
//             return ts.factory.updateInterfaceDeclaration(
//               newNode,
//               newModifiers.length > 0 ? newModifiers : undefined,
//               newNode.name,
//               newNode.typeParameters,
//               newNode.heritageClauses,
//               newNode.members,
//             )
//           } else if (ts.isTypeAliasDeclaration(newNode)) {
//             return ts.factory.updateTypeAliasDeclaration(
//               newNode,
//               newModifiers.length > 0 ? newModifiers : undefined,
//               newNode.name,
//               newNode.typeParameters,
//               newNode.type,
//             )
//           }
//           return newNode
//         }

//         // Otherwise, visit each child
//         return ts.visitEachChild(node, visitor, context)
//       }

//       // Apply the visitor to each node
//       return ts.visitNode(sourceFile, visitor) as ts.SourceFile
//     }
//   }

//   // Create a printer to generate code from AST
//   const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })

//   // Transform the source file
//   const result = ts.transform(sourceFile, [transformerFactory])
//   const transformedSourceFile = result.transformed[0]

//   // Print the transformed source
//   const processedCode = printer.printFile(
//     transformedSourceFile as ts.SourceFile,
//   )

//   // Don't forget to dispose the result
//   result.dispose()

//   return processedCode
// }
