import * as monaco from 'monaco-editor'
import type * as ts from 'typescript'
import { wait } from '../util'

export interface TsWrapperWorker {
  getCompletionsWithImportsAtPosition(
    file: string,
    position: number,
  ): Promise<ts.CompletionInfo | undefined>
  getCompletionEntryDetailsWithImports(
    file: string,
    position: number,
    entryName: string,
    source?: string,
    data?: ts.CompletionEntryData,
  ): Promise<ts.CompletionEntryDetails | undefined>
  getModuleImports(
    fileName: string,
  ): Promise<Array<{ module: string; start: number; end: number }>>
}

type MonacoWorkerGetter = (uri: monaco.Uri) => Promise<unknown>

const TYPESCRIPT_REGISTRATION_ERROR = 'TypeScript not registered!'
const MAX_WORKER_INIT_RETRIES = 20
const INITIAL_WORKER_INIT_RETRY_DELAY_MS = 25
const MAX_WORKER_INIT_RETRY_DELAY_MS = 500
const LANGUAGE_ACTIVATION_TIMEOUT_MS = 5000

let workerGetter: MonacoWorkerGetter | null = null

function isTypeScriptRegistrationError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.includes(TYPESCRIPT_REGISTRATION_ERROR)
  }
  if (error instanceof Error) {
    return error.message.includes(TYPESCRIPT_REGISTRATION_ERROR)
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message.includes(TYPESCRIPT_REGISTRATION_ERROR)
  }
  return false
}

function hasTypeScriptModel(): boolean {
  return monaco.editor
    .getModels()
    .some((model) => model.getLanguageId() === 'typescript')
}

async function waitForTypeScriptLanguageActivation(): Promise<void> {
  if (hasTypeScriptModel()) return

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      disposable?.dispose()
      reject(new Error('Timed out waiting for TypeScript language activation'))
    }, LANGUAGE_ACTIVATION_TIMEOUT_MS)

    const disposable = monaco.languages.onLanguage('typescript', () => {
      clearTimeout(timeoutId)
      disposable?.dispose()
      resolve()
    })
  })
}

/**
 * Get the TypeScript worker instance for a specific URI with retry mechanism
 * Due to editor initialization, the TypeScript worker might not exist immediately
 * after the TypeScript language has been attached
 *
 * @param uri The URI of the model to get the worker for. The worker needs to be
 *            synced with a specific model to access its source files.
 */
export async function getTypeScriptWorker(
  uri: monaco.Uri,
): Promise<TsWrapperWorker> {
  // Get the worker getter if we don't have it yet
  if (!workerGetter) {
    await waitForTypeScriptLanguageActivation()

    // fallback to delay if ts worker still doesn't exist
    let delayMs = INITIAL_WORKER_INIT_RETRY_DELAY_MS
    for (let attempt = 0; attempt < MAX_WORKER_INIT_RETRIES; attempt++) {
      try {
        // Monaco's TypeScript API is not properly typed
        workerGetter =
          (await monaco.typescript.getTypeScriptWorker()) as MonacoWorkerGetter
        break
      } catch (error) {
        if (!isTypeScriptRegistrationError(error)) throw error
        if (attempt === MAX_WORKER_INIT_RETRIES - 1) throw error
        await wait(delayMs)
        delayMs = Math.min(delayMs * 2, MAX_WORKER_INIT_RETRY_DELAY_MS)
      }
    }

    if (!workerGetter) {
      throw new Error('Unable to initialize TypeScript worker getter')
    }
  }

  // Get the worker instance for this specific URI
  // This ensures the worker is synced with the model at this URI
  return (await workerGetter(uri)) as TsWrapperWorker
}
