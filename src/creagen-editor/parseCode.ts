import ts from 'typescript'
import { typescriptCompilerOptions } from '../editor/Editor'
import { LibraryImport } from '../importer'
import { logger } from '../logs/logger'
import { Params, paramConfigSchema } from '../params/Params'
import { editorEvents } from '../events/events'

const P5_LIFECYCLE_FUNCTIONS = [
  'preload',
  'setup',
  'draw',
  'mousePressed',
  'mouseReleased',
  'mouseClicked',
  'mouseMoved',
  'mouseDragged',
  'mouseWheel',
  'keyPressed',
  'keyReleased',
  'keyTyped',
  'touchStarted',
  'touchMoved',
  'touchEnded',
  'windowResized',
  'deviceMoved',
  'deviceTurned',
  'deviceShaken',
]

/**
 * Safely converts a TypeScript AST object literal to a plain JavaScript object
 * without using eval or Function constructor
 */
function astObjectToPlainObject(
  node: ts.ObjectLiteralExpression,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const prop of node.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const name = prop.name
      const value = prop.initializer

      // Get property name
      let key: string
      if (ts.isIdentifier(name)) {
        key = name.text
      } else if (ts.isStringLiteral(name)) {
        key = name.text
      } else {
        continue // Skip computed or other property names
      }

      // Get property value
      result[key] = astNodeToValue(value)
    }
  }

  return result
}

/**
 * Converts an AST node to its JavaScript value
 */
function astNodeToValue(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node)) {
    return node.text
  } else if (ts.isNumericLiteral(node)) {
    return Number(node.text)
  } else if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  } else if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null
  } else if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
    return undefined
  } else if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((el) => astNodeToValue(el))
  } else if (ts.isObjectLiteralExpression(node)) {
    return astObjectToPlainObject(node)
  } else if (ts.isPrefixUnaryExpression(node)) {
    const operand = astNodeToValue(node.operand)
    if (
      node.operator === ts.SyntaxKind.MinusToken &&
      typeof operand === 'number'
    ) {
      return -operand
    }
    if (
      node.operator === ts.SyntaxKind.PlusToken &&
      typeof operand === 'number'
    ) {
      return Number(operand)
    }
  }

  // For unsupported node types, return the node text as a string
  return node.getText()
}

/**
 * Parse code to make it compatible for the editor
 * Uses text replacement for useParam calls, then AST transformation for imports
 */
export function parseCode(
  code: string,
  libraries: Record<string, LibraryImport>,
  params: Params,
): string {
  // Clear params but preserve their values - only params found in the current code will be re-added
  params.clearAndPreserveValues()

  // First pass: collect all useParam calls and their replacements via text-based replacement
  const tempSourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
  )

  // Collect all useParam replacements (position -> replacement text)
  const replacements: Array<{
    start: number
    end: number
    replacement: string
  }> = []

  function collectUseParams(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const expression = node.expression
      if (ts.isIdentifier(expression) && expression.text === 'useParam') {
        const args = node.arguments

        if (args.length <= 2) {
          const typeArg = args[0]
          const optionsArg = args[1]

          if (
            typeArg &&
            ts.isStringLiteral(typeArg) &&
            (optionsArg ? ts.isObjectLiteralExpression(optionsArg) : true)
          ) {
            const type = typeArg.text
            const options =
              optionsArg && ts.isObjectLiteralExpression(optionsArg)
                ? astObjectToPlainObject(optionsArg)
                : {}
            const configObj = { type, ...options }
            const result = paramConfigSchema.safeParse(configObj)

            if (!result.success) {
              logger.error(
                'Invalid useParam options',
                result.error.issues
                  .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                  .join(', '),
              )
            } else {
              const translatedValue = params.addParam(result.data)
              replacements.push({
                start: node.getStart(tempSourceFile),
                end: node.getEnd(),
                replacement: translatedValue,
              })
            }
          }
        }
      }
    }
    ts.forEachChild(node, collectUseParams)
  }

  collectUseParams(tempSourceFile)
  editorEvents.emit('params:update', undefined)

  // Apply replacements in reverse order to maintain correct positions
  replacements.sort((a, b) => b.start - a.start)
  let modifiedCode = code
  for (const { start, end, replacement } of replacements) {
    modifiedCode =
      modifiedCode.substring(0, start) +
      replacement +
      modifiedCode.substring(end)
  }

  // Now parse the modified code for AST transformation (imports and p5)
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    modifiedCode,
    ts.ScriptTarget.Latest,
    true,
  )

  const hasP5 = Boolean(libraries['p5'])
  const p5FunctionsFound = new Set<string>()
  const printer = ts.createPrinter()

  const transformer = <T extends ts.Node>(
    context: ts.TransformationContext,
  ) => {
    return (rootNode: T) => {
      function visit(node: ts.Node): ts.Node {
        // Transform import declarations
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier

          if (ts.isStringLiteral(moduleSpecifier)) {
            const oldModule = moduleSpecifier.text
            const newModulePath = libraries[oldModule]?.importPath.path

            if (newModulePath != null) {
              // Replace module path with the one from libraries
              return ts.factory.updateImportDeclaration(
                node,
                node.modifiers,
                node.importClause,
                ts.factory.createStringLiteral(newModulePath),
                node.assertClause,
              )
            } else if (
              !oldModule.startsWith('.') &&
              !oldModule.startsWith('/')
            ) {
              logger.error(`Library ${oldModule} not found`)
            }
          }
        }

        // Track p5 function declarations if p5 is enabled
        if (hasP5) {
          if (
            ts.isFunctionDeclaration(node) &&
            node.name &&
            P5_LIFECYCLE_FUNCTIONS.includes(node.name.text)
          ) {
            p5FunctionsFound.add(node.name.text)
          }

          if (ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach((decl) => {
              if (
                ts.isIdentifier(decl.name) &&
                P5_LIFECYCLE_FUNCTIONS.includes(decl.name.text)
              ) {
                if (
                  decl.initializer &&
                  (ts.isArrowFunction(decl.initializer) ||
                    ts.isFunctionExpression(decl.initializer))
                ) {
                  p5FunctionsFound.add(decl.name.text)
                }
              }
            })
          }
        }

        return ts.visitEachChild(node, visit, context)
      }

      return ts.visitNode(rootNode, visit) as T
    }
  }

  // Apply transformation
  const result = ts.transform(sourceFile, [transformer])
  const transformedSourceFile = result.transformed[0] as ts.SourceFile
  let transformedCode = printer.printFile(transformedSourceFile)

  // For p5, assign all found lifecycle functions to window and trigger global mode
  if (hasP5 && p5FunctionsFound.size > 0) {
    const assignments = Array.from(p5FunctionsFound)
      .map((fn) => `if (typeof ${fn} !== 'undefined') window.${fn} = ${fn};`)
      .join('\n')
    transformedCode = transformedCode + '\n' + assignments + '\nnew p5();'
  }

  const transpiled = ts.transpile(transformedCode, typescriptCompilerOptions)

  logger.trace(transpiled)

  return transpiled
}
