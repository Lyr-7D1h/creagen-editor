/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import * as monaco from 'monaco-editor'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackageJson } from './index'

// Mock modules BEFORE importing the module under test
vi.mock('monaco-editor', () => ({
  Uri: {
    parse: vi.fn((uri: string) => ({ toString: () => uri })),
  },
  editor: {
    createModel: vi.fn(() => ({
      dispose: vi.fn(),
    })),
    getModel: vi.fn(() => null),
  },
}))

vi.mock('../workers/getTypeScriptWorker', () => ({
  getTypeScriptWorker: vi.fn(),
}))

vi.mock('./index', () => ({
  Importer: {
    getLibrary: vi.fn(),
  },
}))

// Now import the modules
import { getTypeScriptWorker } from '../workers/getTypeScriptWorker'
import { Importer } from './index'
import { getTypings } from './typings'

// Mock fetch
global.fetch = vi.fn()

describe('typings resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset fetch mock
    global.fetch = vi.fn()

    // Setup default worker mock to return imports
    vi.mocked(getTypeScriptWorker).mockResolvedValue({
      getModuleImports: vi.fn().mockResolvedValue([]),
      getCompletionsWithImportsAtPosition: vi.fn(),
      getCompletionEntryDetailsWithImports: vi.fn(),
    } as any)
  })

  describe('getTypings', () => {
    it('should fetch and return typings for a simple package', async () => {
      const pkg: PackageJson = {
        name: 'test-package',

        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
      }

      const mockTypings = 'export type Foo = string'

      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        text: async () => mockTypings,
      } as Response)

      const result = await getTypings('https://cdn.example.com', pkg)

      expect(result).toBe(`declare module 'test-package' {${mockTypings}}`)
      expect(fetch).toHaveBeenCalledWith('https://cdn.example.com/index.d.ts')
    })

    it('should handle @types packages correctly', async () => {
      const pkg: PackageJson = {
        name: '@types/react',
        version: { version: '18.0.0' } as any,
        typings: 'index.d.ts',
      }

      const mockTypings = 'export type FC = () => void'

      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        text: async () => mockTypings,
      } as Response)

      const result = await getTypings('https://cdn.example.com', pkg)

      // Should use 'react' as module name, not '@types/react'
      expect(result).toBe(`declare module 'react' {${mockTypings}}`)
    })

    it('should return null if typings file is not found', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        status: 404,
      } as Response)

      const result = await getTypings('https://cdn.example.com', pkg)

      expect(result).toBeNull()
    })

    it('should fallback to @types package if no typings are specified', async () => {
      const pkg: PackageJson = {
        name: 'some-package',
        version: { version: '1.0.0' } as any,
      }

      const mockLibrary = {
        name: '@types/some-package',
        version: { version: '1.0.0' } as any,
        importMap: [],
        typings: async () =>
          Promise.resolve('declare module "some-package" { export {} }'),
      }

      // Mock Importer to return the @types package directly
      // This bypasses the fetch that would normally happen inside Importer.getLibrary
      vi.mocked(Importer.getLibrary).mockResolvedValueOnce(mockLibrary)

      const result = await getTypings('https://cdn.example.com', pkg)

      expect(result).toBe('declare module "some-package" { export {} }')
      expect(Importer.getLibrary).toHaveBeenCalledWith('@types/some-package')
    })
  })

  describe('import resolution', () => {
    it('should resolve relative imports', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
      }

      // Main file with import
      const mainFile = `import { Helper } from './helper'\nexport type Main = Helper`
      // Helper file
      const helperFile = 'export type Helper = string'

      // Mock worker to return the import for both calls
      const mockGetModuleImports = vi
        .fn()
        .mockResolvedValueOnce([{ module: './helper', start: 0, end: 31 }]) // First call for main file
        .mockResolvedValueOnce([]) // Second call for helper file (no imports)

      vi.mocked(getTypeScriptWorker).mockResolvedValue({
        getModuleImports: mockGetModuleImports,
        getCompletionsWithImportsAtPosition: vi.fn(),
        getCompletionEntryDetailsWithImports: vi.fn(),
      })

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: async () => mainFile,
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: async () => helperFile,
        } as Response)

      const result = await getTypings('https://cdn.example.com', pkg)

      // Should inline the helper content
      expect(result).toContain('export type Helper = string')
      expect(result).toContain('export type Main = Helper')
      expect(fetch).toHaveBeenCalledWith('https://cdn.example.com/index.d.ts')
      expect(fetch).toHaveBeenCalledWith('https://cdn.example.com/helper.d.ts')
    })

    it.skip('should resolve external package imports', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
      }

      const mainFile = `import { Thing } from 'external-package'\nexport type Main = Thing`

      // Mock worker to return the import
      const mockGetModuleImports = vi
        .fn()
        .mockResolvedValueOnce([
          { module: 'external-package', start: 0, end: 38 },
        ])

      vi.mocked(getTypeScriptWorker).mockResolvedValue({
        getModuleImports: mockGetModuleImports,
        getCompletionsWithImportsAtPosition: vi.fn(),
        getCompletionEntryDetailsWithImports: vi.fn(),
      })

      const externalLibrary = {
        name: 'external-package',
        version: { version: '1.0.0' } as any,
        importMap: [],
        typings: async () =>
          'declare module "external-package" { export type Thing = number }',
      }

      vi.mocked(Importer.getLibrary).mockResolvedValueOnce(externalLibrary)

      // Mock fetch for the main index.d.ts file
      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        ok: true,
        statusText: 'OK',
        text: async () => mainFile,
      } as Response)

      const result = await getTypings('https://cdn.example.com', pkg)

      expect(result).toContain('export type Thing = number')
      expect(Importer.getLibrary).toHaveBeenCalledWith('external-package')
    })

    it('should handle circular imports without infinite recursion', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
      }

      // File A imports B, B imports A
      const fileA = `import { B } from './b'\nexport type A = B`
      const fileB = `import { A } from './index'\nexport type B = A`

      let callCount = 0
      vi.mocked(getTypeScriptWorker).mockResolvedValue({
        getModuleImports: vi.fn().mockImplementation(async () => {
          callCount++
          if (callCount === 1) return [{ module: './b', start: 0, end: 20 }]
          if (callCount === 2) return [{ module: './index', start: 0, end: 25 }]
          return []
        }),
        getCompletionsWithImportsAtPosition: vi.fn(),
        getCompletionEntryDetailsWithImports: vi.fn(),
      })

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          status: 200,
          text: async () => fileA,
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          text: async () => fileB,
        } as Response)

      const result = await getTypings('https://cdn.example.com', pkg)

      // Should not crash and should visit index.d.ts only once
      expect(result).toBeTruthy()
      expect(fetch).toHaveBeenCalledTimes(2) // Only fetched index and b, not index again
    })

    it('should use regex fallback if worker fails', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
      }

      const mainFile = `import { Helper } from './helper'\nexport type Main = Helper`
      const helperFile = 'export type Helper = string'

      // Make worker throw an error
      vi.mocked(getTypeScriptWorker).mockRejectedValueOnce(
        new Error('Worker not available'),
      )

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          status: 200,
          text: async () => mainFile,
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          text: async () => helperFile,
        } as Response)

      const result = await getTypings('https://cdn.example.com', pkg)

      // Should still work using regex fallback
      expect(result).toContain('export type Helper = string')
      expect(result).toContain('export type Main = Helper')
    })

    it('should handle package.json exports field', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
        exports: {
          './utils': {
            types: './dist/utils.d.ts',
            import: './dist/utils.js',
          },
        },
      }

      const mainFile = `import { Helper } from './utils'\nexport type Main = Helper`
      const utilsFile = 'export type Helper = string'

      // Mock worker for both file calls
      const mockGetModuleImports = vi
        .fn()
        .mockResolvedValueOnce([{ module: './utils', start: 0, end: 28 }]) // First call for main file
        .mockResolvedValueOnce([]) // Second call for utils file (no imports)

      vi.mocked(getTypeScriptWorker).mockResolvedValue({
        getModuleImports: mockGetModuleImports,
        getCompletionsWithImportsAtPosition: vi.fn(),
        getCompletionEntryDetailsWithImports: vi.fn(),
      })

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: async () => mainFile,
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: async () => utilsFile,
        } as Response)

      const result = await getTypings('https://cdn.example.com', pkg)

      // Should resolve using exports field
      expect(result).toContain('export type Helper = string')
      expect(fetch).toHaveBeenCalledWith(
        'https://cdn.example.com/dist/utils.d.ts',
      )
    })
  })

  describe('Monaco model management', () => {
    it('should create temporary models for worker', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
      }

      const mockTypings = 'export type Foo = string'

      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        text: async () => mockTypings,
      } as Response)

      await getTypings('https://cdn.example.com', pkg)

      // Should create a model
      expect(monaco.editor.createModel).toHaveBeenCalled()

      // Should dispose the model
      const mockModel = vi.mocked(monaco.editor.createModel).mock.results[0]
        ?.value
      expect(mockModel?.dispose).toHaveBeenCalled()
    })

    it('should not dispose existing models', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: { version: '1.0.0' } as any,
        typings: 'index.d.ts',
      }

      const mockTypings = 'export type Foo = string'
      const existingModel = { dispose: vi.fn() }

      // Mock an existing model
      vi.mocked(monaco.editor.getModel).mockReturnValueOnce(
        existingModel as any,
      )

      vi.mocked(fetch).mockResolvedValueOnce({
        status: 200,
        text: async () => mockTypings,
      } as Response)

      await getTypings('https://cdn.example.com', pkg)

      // Should not create a new model
      expect(monaco.editor.createModel).not.toHaveBeenCalled()

      // Should not dispose existing model
      expect(existingModel.dispose).not.toHaveBeenCalled()
    })
  })
})
