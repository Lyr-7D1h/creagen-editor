import type * as ts from 'typescript'
// @ts-expect-error -- Monaco internal worker entry has no type declarations
import { initialize } from 'monaco-editor/esm/vs/common/initialize.js'
// @ts-expect-error -- Monaco internal worker entry has no type declarations
import { TypeScriptWorker } from 'monaco-editor/esm/vs/language/typescript/tsWorker.js'

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

/** Extend base typescript language worker with extra auto completion functionality */
class AutoImportWorker extends BaseTypeScriptWorker {
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
}

self.onmessage = () => {
  initializeWorker((ctx, createData) => {
    return new AutoImportWorker(ctx, createData)
  })
}
