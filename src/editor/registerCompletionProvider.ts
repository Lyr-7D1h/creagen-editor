import * as monaco from 'monaco-editor'
import { LruCache, recordToCacheKey } from '../shared/LruCache'
import type { CompletionEntryData, CompletionInfo } from 'typescript'
import { type CompletionEntryDetails } from 'typescript'

function normalizeUriPath(value: string) {
  try {
    if (value.startsWith('file:///')) {
      return decodeURIComponent(new URL(value).pathname)
    }
  } catch {
    // Keep raw value if URL parsing fails.
  }
  return value
}

function getImportEditsFromDetails(
  model: monaco.editor.ITextModel,
  details: CompletionEntryDetails | undefined,
): monaco.languages.TextEdit[] | undefined {
  if (details == null || details.codeActions == null) return undefined

  const modelFileNames = new Set([
    model.uri.toString(),
    model.uri.toString(true),
    normalizeUriPath(model.uri.toString()),
    normalizeUriPath(model.uri.toString(true)),
  ])

  const edits: monaco.languages.TextEdit[] = []
  for (const action of details.codeActions) {
    for (const change of action.changes) {
      const changeFileName = normalizeUriPath(change.fileName)
      if (
        !modelFileNames.has(change.fileName) &&
        !modelFileNames.has(changeFileName)
      ) {
        continue
      }

      for (const textChange of change.textChanges) {
        const start = model.getPositionAt(textChange.span.start)
        const end = model.getPositionAt(
          textChange.span.start + textChange.span.length,
        )
        edits.push({
          range: new monaco.Range(
            start.lineNumber,
            start.column,
            end.lineNumber,
            end.column,
          ),
          text: textChange.newText,
        })
      }
    }
  }

  return edits.length > 0 ? edits : undefined
}

interface AutoImportCompletionMeta {
  file: string
  offset: number
  entryName: string
  source?: string
  data?: CompletionEntryData
}

type AutoImportCompletionItem = monaco.languages.CompletionItem & {
  __autoImportMeta?: AutoImportCompletionMeta
}

const DETAILS_CACHE_MAX_ENTRIES = 400

// Very unlikely character to appear in key parts.
const CACHE_KEY_SEPARATOR = '\u001f'
function buildAutoImportDetailsCacheKey(
  meta: AutoImportCompletionMeta,
): string {
  return [
    meta.file,
    String(meta.offset),
    meta.entryName,
    meta.source ?? '',
    meta.data == null
      ? ''
      : recordToCacheKey(meta.data as unknown as Record<string, unknown>),
  ].join(CACHE_KEY_SEPARATOR)
}

interface TsWrapperWorker {
  getCompletionsWithImportsAtPosition(
    file: string,
    position: number,
  ): Promise<CompletionInfo | undefined>
  getCompletionEntryDetailsWithImports(
    file: string,
    position: number,
    entryName: string,
    source?: string,
    data?: CompletionEntryData,
  ): Promise<CompletionEntryDetails | undefined>
}

export async function registerCompletionProvider() {
  const getWorker = await monaco.typescript.getTypeScriptWorker()
  const worker = await getWorker()
  const autoImportWorker = worker as unknown as TsWrapperWorker

  const detailsCache = new LruCache<
    string,
    Promise<CompletionEntryDetails | undefined>
  >(DETAILS_CACHE_MAX_ENTRIES)

  const getDetails = (meta: AutoImportCompletionMeta) => {
    const cacheKey = buildAutoImportDetailsCacheKey(meta)
    const cached = detailsCache.get(cacheKey)
    if (cached != null) return cached

    const request = autoImportWorker.getCompletionEntryDetailsWithImports(
      meta.file,
      meta.offset,
      meta.entryName,
      meta.source,
      meta.data,
    )
    detailsCache.set(cacheKey, request)
    return request
  }

  monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['.', '"', "'", '/', '@'],
    async provideCompletionItems(model, position) {
      const file = model.uri.toString()
      const offset = model.getOffsetAt(position)

      const completions =
        await autoImportWorker.getCompletionsWithImportsAtPosition(file, offset)

      const wordAtPosition = model.getWordAtPosition(position)
      const baseRange = wordAtPosition
        ? new monaco.Range(
            position.lineNumber,
            wordAtPosition.startColumn,
            position.lineNumber,
            wordAtPosition.endColumn,
          )
        : new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          )

      const suggestions: AutoImportCompletionItem[] = []
      for (const completion of completions?.entries ?? []) {
        if (!completion.data?.moduleSpecifier) continue

        const startPosition = completion.replacementSpan
          ? model.getPositionAt(completion.replacementSpan.start)
          : baseRange.getStartPosition()
        const endPosition = completion.replacementSpan
          ? model.getPositionAt(
              completion.replacementSpan.start +
                completion.replacementSpan.length,
            )
          : baseRange.getEndPosition()

        const item: AutoImportCompletionItem = {
          label: {
            label: completion.name,
            description: completion.data.moduleSpecifier,
          },
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: completion.insertText ?? completion.name,
          range: new monaco.Range(
            startPosition.lineNumber,
            startPosition.column,
            endPosition.lineNumber,
            endPosition.column,
          ),
          sortText: `~${completion.sortText ?? completion.name}`,
          __autoImportMeta: {
            file,
            offset,
            entryName: completion.name,
            source: completion.source,
            data: completion.data,
          },
        }

        suggestions.push(item)
      }

      // If first suggestion is an import suggestion, prefetch details.
      if (suggestions[0]?.__autoImportMeta != null) {
        void getDetails(suggestions[0].__autoImportMeta)
      }

      return {
        suggestions,
        incomplete: true,
      }
    },
    async resolveCompletionItem(item) {
      const completionItem = item as AutoImportCompletionItem
      const meta = completionItem.__autoImportMeta
      if (meta == null) return completionItem

      const model = monaco.editor.getModel(monaco.Uri.parse(meta.file))
      if (model == null) return completionItem

      const details = await getDetails(meta)
      completionItem.additionalTextEdits = getImportEditsFromDetails(
        model,
        details,
      )
      return completionItem
    },
  })
}
