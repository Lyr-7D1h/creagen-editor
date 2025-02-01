import fg from 'fast-glob'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import react from '@vitejs/plugin-react'

const LIBRARY_PATH = path.resolve('../creagen')

/** Serve local build of creagen library */
function localLibraryOnHttp() {
  const allowedPaths = ['/creagen.js', '/creagen.d.ts', '/creagen.js.map']
  return {
    apply: 'serve',
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (allowedPaths.includes(req.originalUrl)) {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
            res.writeHead(200)
            res.write(
              fs.readFileSync(`${LIBRARY_PATH}/dist/${req.originalUrl}`),
            )
            res.end()
          }

          next()
        })
      }
    },
    name: 'creagen-library',
  }
}

export default defineConfig(async ({ command, mode }) => {
  process.env = {
    ...process.env,
    ...loadEnv(mode, process.cwd()),
    VITE_DEBUG: true,
    VITE_CREAGEN_EDITOR_VERSION: process.env.npm_package_version,
    // use the latest local version by default
    VITE_CREAGEN_VERSION: JSON.parse(
      fs.readFileSync(`${LIBRARY_PATH}/package.json`),
    ).version,
  }

  return {
    plugins: [
      localLibraryOnHttp(),
      {
        name: 'watch-external',
        async buildStart() {
          const files = await fg(['src/**/*', `${LIBRARY_PATH}/src/**/*`])
          for (const file of files) {
            this.addWatchFile(file)
          }
        },
        handleHotUpdate({ file, server }) {
          if (file.includes(LIBRARY_PATH)) {
            server.ws.send({
              type: 'full-reload',
              path: '*',
            })
            return []
          }
        },
      },
      react(),
    ],
    optimizeDeps: {
      exclude: ['creagen'],
    },
  }
})
