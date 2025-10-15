import ts from 'typescript'
import { typescriptCompilerOptions } from '../editor/Editor'
import { LibraryImport } from '../importer'
import { logger } from '../logs/logger'

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
 * Parse code to make it compatible for the editor
 * Uses AST transformation to update imports
 */
export function parseCode(
  code: string,
  libraries: Record<string, LibraryImport>,
): string {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
  )

  const hasP5 = !!libraries['p5']
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

            if (newModulePath) {
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

  return ts.transpile(transformedCode, typescriptCompilerOptions)
}
