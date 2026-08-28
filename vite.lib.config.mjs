import fs from 'fs'
import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import dts from 'unplugin-dts/vite'
import tailwindcss from '@tailwindcss/vite'
import { esmExternalRequirePlugin } from 'rolldown/plugins'

const commitHeadFile = './.git/FETCH_HEAD'
export function commitHash() {
  if (process.env.CREAGEN_EDITOR_COMMIT_HASH)
    return process.env.CREAGEN_EDITOR_COMMIT_HASH
  if (!fs.existsSync(commitHeadFile)) {
    console.warn(`No commit hash found: ${commitHeadFile} doesnt exist`)
    return null
  }
  const head = fs.readFileSync(commitHeadFile, 'utf-8')
  for (const line of head.split('\n')) {
    const [commit, _, __, branch] = line.split(/ |\t+/)
    if (branch && branch.replaceAll("'", '') === 'master') {
      return commit
    }
  }
  console.warn('No commit hash found')
  return null
}

export default defineConfig({
  define: {
    CREAGEN_MODE: JSON.stringify('release'),
    CREAGEN_DEV_VERSION: JSON.stringify(null),
    CREAGEN_EDITOR_VERSION: JSON.stringify(process.env.npm_package_version),
    CREAGEN_EDITOR_COMMIT_HASH: JSON.stringify(commitHash()),
    CREAGEN_EDITOR_CONTROLLER_URL: JSON.stringify(null),
    CREAGEN_EDITOR_SANDBOX_RUNTIME_URL: JSON.stringify(null),
    CREAGEN_LOG_LEVEL: JSON.stringify(process.env.CREAGEN_LOG_LEVEL ?? '0'), // no logs
    CREAGEN_REMOTE_URL: JSON.stringify(null),
    CREAGEN_TURNSTILE_SITE_KEY: JSON.stringify(null),
  },
  base: './',
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/index.ts'),
      name: 'CreagenEditor',
      formats: ['es'],
      fileName: (format) =>
        `creagen-editor.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    sourcemap: true,
    cssCodeSplit: false,
    emptyOutDir: true,
    minify: 'oxc',
    rollupOptions: {
      plugins: [
        esmExternalRequirePlugin({
          external: ['react', 'react-dom', 'react/jsx-runtime'],
        }),
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    dts({
      exclude: ['src/main.tsx' ],
    }),
  ],
})
