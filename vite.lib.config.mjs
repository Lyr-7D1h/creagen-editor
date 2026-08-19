import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import dts from 'unplugin-dts/vite'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  define: {
    CREAGEN_MODE: JSON.stringify('production'),
    CREAGEN_DEV_VERSION: JSON.stringify(null),
    CREAGEN_EDITOR_VERSION: JSON.stringify(process.env.npm_package_version),
    CREAGEN_EDITOR_COMMIT_HASH: JSON.stringify(null),
    CREAGEN_LOG_LEVEL: JSON.stringify(process.env.CREAGEN_LOG_LEVEL ?? '0'),
    CREAGEN_TURNSTILE_SITE_KEY: JSON.stringify(
      process.env.CREAGEN_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA',
    ),
  },
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/index.ts'),
      name: 'CreagenEditor',
      formats: ['es', 'cjs'],
      fileName: (format) =>
        `creagen-editor.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    sourcemap: true,
    cssCodeSplit: false,
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'monaco-editor',
        'monaco-vim',
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
