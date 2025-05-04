import { fetch } from '../fetch'
import { SemVer } from 'semver'
import { TYPESCRIPT_IMPORT_REGEX } from '../constants'
import { CREAGEN_DEV_VERSION } from '../env'
import { LIBRARY_CONFIGS } from './libraryConfigs'
import { Library } from '../settings/Settings'
import { z } from 'zod'
import { semver } from './schemaUtils'

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
type PackageJson = z.infer<typeof packageJsonSchema>

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

async function getTypings(rootUrl: string, pkg: PackageJson) {
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
    console.log(res)
    throw new Error(`Failed to fetch ${url} ${res.status} - ${res.statusText}`)
  }
  const pkg = await packageJsonSchema.parseAsync(await res.json())

  const typings = async () => getTypings(url, pkg)

  let importPath: ImportPath = {
    type: 'main',
    path: `${packageSourceUrl}/${packageName}${version ? `@${version}` : ''}/${pkg.main || pkg.browser}`,
  }
  console.log(pkg)
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

/** check if a module path is just the module name */
function isValidImportModule(modulePath: string) {
  if (modulePath.startsWith('.') || modulePath.includes('/')) return false

  return modulePath.split(' ')[0]?.match(/^[A-Za-z]+$/) !== null
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
