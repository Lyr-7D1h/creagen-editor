import fg from 'fast-glob'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'

const LIBRARY_PATH = '../genart'

/** Serve local build of genart library */
function localLibrary() {
  return {
    apply: 'serve',
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (
            req.originalUrl === '/genart.js' ||
            req.originalUrl === '/genart.d.ts'
          ) {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
            res.writeHead(200)
            res.write(
              fs.readFileSync(
                path.join(__dirname, `${LIBRARY_PATH}/dist/${req.originalUrl}`),
              ),
            )
            res.end()
          }

          next()
        })
      }
    },
    name: 'genart-library',
  }
}

export default defineConfig(async ({ command, mode }) => {
  process.env = {
    ...process.env,
    ...loadEnv(mode, process.cwd()),
    VITE_DEBUG: true,
    VITE_GENART_EDITOR_VERSION: process.env.npm_package_version,
    // use the latest local version by default
    VITE_GENART_VERSION: JSON.parse(
      fs.readFileSync(path.join(__dirname, `${LIBRARY_PATH}/package.json`)),
    ).version,
  }

  return {
    server: {
      fs: {
        allow: [
          path.resolve(__dirname, `${LIBRARY_PATH}/dist/genart.d.ts`),
          path.resolve(__dirname, `${LIBRARY_PATH}/dist/genart.js`),
          ...(await fg(['src/**/*', `${LIBRARY_PATH}/src/**/*`])),
          'node_modules',
          'main.css',
        ],
      },
      watch: {
        paths: [
          path.resolve(__dirname, `${LIBRARY_PATH}/dist/genart.d.ts`),
          path.resolve(__dirname, `${LIBRARY_PATH}/dist/genart.js`),
        ],
        ignored: ['**/node_modules/**'],
        usePolling: true,
        interval: 100,
      },
    },
    plugins: [
      localLibrary(),
      {
        name: 'watch-external',
        async buildStart() {
          const files = await fg(['src/**/*', `${LIBRARY_PATH}/src/**/*`])
          for (const file of files) {
            this.addWatchFile(file)
          }
        },
      },
    ],
  }
})
