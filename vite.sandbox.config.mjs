import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        sandbox: path.resolve(__dirname, 'sandbox-runtime/index.html'),
      },
    },
  },
})
