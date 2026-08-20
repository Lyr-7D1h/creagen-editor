import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import dts from 'unplugin-dts/vite'
import tailwindcss from '@tailwindcss/vite'
import { esmExternalRequirePlugin } from 'rolldown/plugins'


export default defineConfig({
  define: {
    CREAGEN_MODE: JSON.stringify('release'),
    CREAGEN_EDITOR_VERSION: JSON.stringify(process.env.npm_package_version),
    CREAGEN_EDITOR_COMMIT_HASH: JSON.stringify(null),
    CREAGEN_LOG_LEVEL: JSON.stringify(process.env.CREAGEN_LOG_LEVEL ?? '5'), // no logs
  },
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
      external: [
        'monaco-editor',
        'monaco-vim',
      ],
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
