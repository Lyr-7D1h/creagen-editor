import { LibraryImport, PackageJson } from './index'

export interface ExportCondition {
  import?: string
  require?: string
  types?: string
  default?: string
  [key: string]: string | ExportCondition | undefined
}

export type ExportsField =
  | string
  | ExportCondition
  | Record<string, string | ExportCondition>

/**
 * Resolves a subpath import using the package.json exports field
 * @param exports The exports field from package.json
 * @param subpath The subpath being imported (e.g., 'addons/controls/OrbitControls.js')
 * @param conditions The conditions to check (e.g., ['import', 'default'])
 * @returns The resolved path or null if not found
 */
export function resolveExports(
  exports: ExportsField | undefined,
  subpath: string,
  conditions: string[] = ['import', 'types', 'default'],
): string | null {
  if (typeof exports === 'undefined') return null

  // If exports is a string or condition object, it's for "." only
  if (typeof exports === 'string') {
    return subpath === '.' ? exports : null
  }

  // Check if it's a condition object (has import/require/types keys)
  if (isConditionObject(exports)) {
    return subpath === '.' ? resolveCondition(exports, conditions) : null
  }

  // It's an exports map, resolve the subpath
  return resolveSubpath(exports, subpath, conditions)
}

/**
 * Check if an object is a condition object (contains import/require/types/default)
 */
function isConditionObject(
  obj: Record<string, unknown>,
): obj is ExportCondition {
  const conditionKeys = [
    'import',
    'require',
    'types',
    'default',
    'node',
    'browser',
  ]
  return Object.keys(obj).some((key) => conditionKeys.includes(key))
}

/**
 * Resolve a condition object by checking conditions in order
 */
function resolveCondition(
  condition: ExportCondition,
  conditions: string[],
): string | null {
  for (const cond of conditions) {
    const value = condition[cond]
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'object') {
      const resolved = resolveCondition(value, conditions)
      if (resolved !== null) return resolved
    }
  }
  return null
}

/**
 * Resolve a subpath from an exports map
 */
function resolveSubpath(
  exportsMap: Record<string, string | ExportCondition>,
  subpath: string,
  conditions: string[],
): string | null {
  // Normalize subpath to start with ./
  const normalizedSubpath = subpath.startsWith('./') ? subpath : `./${subpath}`

  // Try exact match first
  const exactMatch = exportsMap[normalizedSubpath]
  if (typeof exactMatch !== 'undefined') {
    if (typeof exactMatch === 'string') return exactMatch
    return resolveCondition(exactMatch, conditions)
  }

  // Try pattern matching (e.g., "./addons/*": "./examples/jsm/*")
  for (const [pattern, target] of Object.entries(exportsMap)) {
    if (pattern.includes('*')) {
      const matched = matchPattern(normalizedSubpath, pattern)
      if (matched !== null) {
        if (typeof target === 'string') {
          return target.replace('*', matched)
        }
        const resolved = resolveCondition(target, conditions)
        return resolved !== null ? resolved.replace('*', matched) : null
      }
    }
  }

  return null
}

/**
 * Match a subpath against a pattern with wildcards
 * @returns The matched wildcard content or null if no match
 */
function matchPattern(subpath: string, pattern: string): string | null {
  const wildcardIndex = pattern.indexOf('*')
  if (wildcardIndex === -1) return null

  const prefix = pattern.slice(0, wildcardIndex)
  const suffix = pattern.slice(wildcardIndex + 1)

  if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) {
    return null
  }

  return subpath.slice(
    prefix.length,
    suffix.length === 0 ? undefined : -suffix.length,
  )
}

/**
 * Extended package.json schema that includes exports field
 */
export interface PackageJsonWithExports extends PackageJson {
  exports?: ExportsField
}

/**
 * Helper to resolve import paths for typings
 * @param pkg Package.json with exports field
 * @param importPath The import path to resolve (e.g., 'three/addons/controls/OrbitControls.js')
 * @returns Object with resolved runtime and types paths
 */
export function resolveImportPath(
  pkg: PackageJsonWithExports,
  importPath: string,
): { runtimePath: string | null; typesPath: string | null } {
  // Remove package name from import path to get subpath
  const packageName = pkg.name
  let subpath = importPath.startsWith(packageName)
    ? importPath.slice(packageName.length)
    : importPath

  // If no subpath, it's the main export
  if (!subpath || subpath === '/') {
    subpath = '.'
  } else if (!subpath.startsWith('./')) {
    subpath = `.${subpath}`
  }

  const runtimePath = resolveExports(pkg.exports, subpath, [
    'import',
    'default',
  ])
  const typesPath = resolveExports(pkg.exports, subpath, [
    'types',
    'import',
    'default',
  ])

  return { runtimePath, typesPath }
}

function buildImportPathsFromExports(
  packageName: string,
  baseUrl: string,
  exports: ExportsField,
  conditions: string[] = ['import', 'default'],
) {
  const importMap: [string, string][] = []

  if (typeof exports === 'object' && !isConditionObject(exports)) {
    // Build map from exports patterns
    for (const [pattern, target] of Object.entries(exports)) {
      let resolvedTarget: string | null = null
      if (typeof target === 'string') {
        resolvedTarget = target
      } else if (typeof target === 'object') {
        resolvedTarget = resolveCondition(target, conditions)
      }

      if (resolvedTarget === null) continue

      if (pattern.includes('*')) {
        const prefix = pattern.replace('*', '')
        const targetPrefix = resolvedTarget.replace('*', '')
        const importKey = `${packageName}${prefix.slice(1)}`
        const importValue = `${baseUrl}${targetPrefix.slice(1)}`
        importMap.push([importKey, importValue])
      } else {
        const importKey =
          pattern === '.' ? packageName : `${packageName}${pattern.slice(1)}`
        const importValue = `${baseUrl}${resolvedTarget.slice(1)}`
        importMap.push([importKey, importValue])
      }
    }
  }

  return importMap
}

/**
 * Build an import map for Monaco editor to resolve subpath imports
 * @param packageName The package name
 * @param baseUrl The CDN base URL for the package
 * @param pkg The package.json
 * @returns Import map entries
 */
export function buildImportPaths(
  packageName: string,
  baseUrl: string,
  pkg: PackageJsonWithExports,
  conditions: string[] = ['import', 'default'],
): Pick<LibraryImport, 'preload' | 'importMap'> {
  if (typeof pkg.exports !== 'undefined')
    return {
      importMap: buildImportPathsFromExports(
        packageName,
        baseUrl,
        pkg.exports,
        conditions,
      ),
    }

  if (pkg.module != null) {
    const path = `${baseUrl}/${pkg.module}`
    return {
      preload: [
        {
          type: 'module',
          path,
        },
      ],
      importMap: [[packageName, path]],
    }
  }

  const path = `${baseUrl}/${pkg.browser ?? pkg.main}`
  return {
    preload: [
      {
        type: 'main',
        path,
      },
    ],
    importMap: [[packageName, path]],
  }
}
