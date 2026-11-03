// @ts-check
import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'docs/.vitepress/**',
      'vite.config.mjs',
      'vite.lib.config.mjs',
      'vitest.config.mjs',
      'eslint.config.mjs',
    ],
  },
  {
    settings: {
      react: { version: '19.0.0' },
    },
  },
  js.configs.recommended,
  // Typed rules need type info, so apply them to TS/TSX only; the preset
  // applied globally breaks on JS files that aren't in any tsconfig.
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  reactHooksPlugin.configs.flat['recommended-latest'],
  reactRefreshPlugin.configs.vite,
  // Add overrides/extra config as a plain object:
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        // @ts-ignore
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // etc.
    },
  },
)
