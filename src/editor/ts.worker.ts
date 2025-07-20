import ts from 'typescript'

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  esModuleInterop: true,
  module: ts.ModuleKind.ESNext,
  noEmit: true,
  allowJs: true,
  strict: false,
  skipLibCheck: true,
}

let languageService: ts.LanguageService | null = null
const files: {
  [fileName: string]: { file: ts.IScriptSnapshot; version: number }
} = {}
const fileVersions: { [fileName: string]: number } = {}

async function setup() {
  // Load TypeScript lib
  const libSource = await fetch(
    'https://cdn.jsdelivr.net/npm/typescript@5.5.4/lib/lib.esnext.d.ts',
  ).then((res) => res.text())
  const libPath = 'lib.esnext.d.ts'
  files[libPath] = {
    file: ts.ScriptSnapshot.fromString(libSource),
    version: 0,
  }

  // Load creagen types
  try {
    // Try multiple possible paths for creagen types
    let creagenTypes: string | null = null
    const possiblePaths = [
      '/p/creagen/dist/creagen.d.ts',
      '../creagen/dist/creagen.d.ts',
      '/creagen/dist/creagen.d.ts',
      'https://cdn.jsdelivr.net/npm/creagen@latest/dist/creagen.d.ts'
    ]
    
    for (const path of possiblePaths) {
      try {
        creagenTypes = await fetch(path).then((res) => res.text())
        break
      } catch (e) {
        console.warn(`Failed to load creagen types from ${path}`)
      }
    }
    
    if (creagenTypes) {
      // Create a virtual module declaration for creagen
      const moduleDeclaration = `declare module "creagen" {\n${creagenTypes}\n}`
      files['node_modules/@types/creagen/index.d.ts'] = {
        file: ts.ScriptSnapshot.fromString(moduleDeclaration),
        version: 0,
      }
    }
  } catch (error) {
    console.warn('Could not load creagen types:', error)
  }
}

let setupPromise: Promise<void> | null = null

function getLanguageService() {
  if (languageService) {
    return languageService
  }

  const documentRegistry = ts.createDocumentRegistry()
  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(files),
    getScriptVersion: (fileName) => files[fileName]?.version.toString() || '0',
    getScriptSnapshot: (fileName) => files[fileName]?.file,
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => 'lib.esnext.d.ts',
    fileExists: (path) => path in files,
    readFile: (path) =>
      path in files
        ? files[path].file.getText(0, files[path].file.getLength())
        : undefined,
  }

  languageService = ts.createLanguageService(servicesHost, documentRegistry)
  return languageService
}

self.onmessage = async (event) => {
  if (!setupPromise) {
    setupPromise = setup()
  }
  await setupPromise

  const { type, payload } = event.data
  const service = getLanguageService()

  switch (type) {
    case 'update': {
      const { fileName, code, version } = payload
      fileVersions[fileName] = version
      if (files[fileName]) {
        files[fileName].version++
        files[fileName].file = ts.ScriptSnapshot.fromString(code)
      } else {
        files[fileName] = {
          file: ts.ScriptSnapshot.fromString(code),
          version: 0,
        }
      }
      const diagnostics = service
        .getSyntacticDiagnostics(fileName)
        .concat(service.getSemanticDiagnostics(fileName))
        .filter(
          (diagnostic) => diagnostic.file && diagnostic.start !== undefined,
        )
        .map((diagnostic) => {
          const { line, character } = ts.getLineAndCharacterOfPosition(
            diagnostic.file!,
            diagnostic.start!,
          )
          return {
            message: ts.flattenDiagnosticMessageText(
              diagnostic.messageText,
              '\n',
            ),
            start: diagnostic.start,
            length: diagnostic.length,
            line,
            character,
            category: diagnostic.category,
            code: diagnostic.code,
          }
        })
      self.postMessage({
        type: 'diagnostics',
        payload: { diagnostics, fileName, version },
      })
      break
    }
    case 'completions': {
      const { fileName, position, version } = payload
      const completions = service.getCompletionsAtPosition(
        fileName,
        position,
        undefined,
      )
      self.postMessage({
        type: 'completions',
        payload: { completions, fileName, version },
      })
      break
    }
    case 'hover': {
      const { fileName, position, version } = payload
      const quickInfo = service.getQuickInfoAtPosition(fileName, position)
      self.postMessage({
        type: 'hover',
        payload: { quickInfo, fileName, version },
      })
      break
    }
    case 'clearTypings': {
      // Remove all library files but keep lib files
      const keysToRemove = Object.keys(files).filter(
        (key) => !key.endsWith('.d.ts') || key.startsWith('node_modules'),
      )
      keysToRemove.forEach((key) => {
        delete files[key]
        delete fileVersions[key]
      })
      // Force recreation of language service
      languageService = null
      break
    }
    case 'addTypings': {
      const { typings, uri, packageName } = payload
      if (packageName && typings) {
        // Create a virtual module file for the library
        const virtualPath = `node_modules/@types/${packageName}/index.d.ts`
        files[virtualPath] = {
          file: ts.ScriptSnapshot.fromString(typings),
          version: 0,
        }
        // Force recreation of language service to pick up new types
        languageService = null
      }
      break
    }
  }
}
