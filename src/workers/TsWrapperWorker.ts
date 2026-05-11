// Import types from TypeScript (erased at compile time, no runtime cost)
import type * as ts from 'typescript'
// @ts-expect-error -- Monaco internal worker entry has no type declarations
import { initialize } from 'monaco-editor/esm/vs/common/initialize.js'
// Import Monaco's TypeScript runtime (this is the actual code that runs)
// @ts-expect-error -- Monaco internal worker entry has no type declarations
import { typescript } from 'monaco-editor/esm/vs/language/typescript/lib/typescriptServices.js'
// @ts-expect-error -- Monaco internal worker entry has no type declarations
import { TypeScriptWorker } from 'monaco-editor/esm/vs/language/typescript/tsWorker.js'

// Use Monaco's TypeScript at runtime (cast to match the type imports)
const tsRuntime = typescript as typeof ts

interface BaseTypeScriptWorkerInstance {
  getLanguageService(): ts.LanguageService
  getCompletionsAtPosition(
    fileName: string,
    position: number,
  ): Promise<ts.CompletionInfo | undefined>
  getCompletionEntryDetails(
    fileName: string,
    position: number,
    entryName: string,
  ): Promise<ts.CompletionEntryDetails | undefined>
}

type BaseTypeScriptWorkerCtor = new (
  ctx: unknown,
  createData: unknown,
) => BaseTypeScriptWorkerInstance

const BaseTypeScriptWorker =
  TypeScriptWorker as unknown as BaseTypeScriptWorkerCtor
const initializeWorker = initialize as unknown as (
  callback: (ctx: unknown, createData: unknown) => unknown,
) => void
const defaultFormatOptions: ts.FormatCodeSettings = {}
const defaultUserPreferences: ts.UserPreferences = {}

/** Wrapper around default monaco Typescript Workers, exposes other ts language server functions */
class TsWrapperWorker extends BaseTypeScriptWorker {
  getCompletionsWithImportsAtPosition(
    fileName: string,
    position: number,
  ): Promise<ts.CompletionInfo | undefined> {
    return Promise.resolve(
      this.getLanguageService().getCompletionsAtPosition(fileName, position, {
        includeCompletionsForModuleExports: true,
      }),
    )
  }

  getCompletionEntryDetailsWithImports(
    fileName: string,
    position: number,
    entryName: string,
    source?: string,
    data?: ts.CompletionEntryData,
  ): Promise<ts.CompletionEntryDetails | undefined> {
    try {
      return Promise.resolve(
        this.getLanguageService().getCompletionEntryDetails(
          fileName,
          position,
          entryName,
          defaultFormatOptions,
          source,
          defaultUserPreferences,
          data,
        ),
      )
    } catch {
      return Promise.resolve(undefined)
    }
  }

  /**
   * Get all import/export module specifiers from a source file with their locations
   * @param fileName The file to analyze
   * @returns Array of objects containing module name and text range for replacement
   */
  getModuleImports(
    fileName: string,
  ): Promise<Array<{ module: string; start: number; end: number }>> {
    const program = this.getLanguageService().getProgram()
    if (!program) throw new Error('Program not found')

    const sourceFile = program.getSourceFile(fileName)
    if (!sourceFile) throw new Error('Source file not found')

    const imports: Array<{ module: string; start: number; end: number }> = []

    // Walk the AST to find import/export declarations
    const visit = (node: ts.Node): void => {
      if (
        tsRuntime.isImportDeclaration(node) ||
        tsRuntime.isExportDeclaration(node)
      ) {
        const moduleSpecifier = node.moduleSpecifier
        if (moduleSpecifier && tsRuntime.isStringLiteral(moduleSpecifier)) {
          imports.push({
            module: moduleSpecifier.text,
            start: node.getStart(sourceFile),
            end: node.getEnd(),
          })
        }
      }
      tsRuntime.forEachChild(node, visit)
    }

    visit(sourceFile)
    return Promise.resolve(imports)
  }
}

self.onmessage = () => {
  initializeWorker((ctx, createData) => {
    return new TsWrapperWorker(ctx, createData)
  })
}
