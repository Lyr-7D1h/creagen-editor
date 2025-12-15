import fg from 'fast-glob'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import react from '@vitejs/plugin-react'

/** Serve local build of creagen library */
function localLibraryOnHttp(mode) {
  // don't load if not dev
  if (mode !== 'dev') return {}

  const allowedPaths = ['/creagen.js', '/creagen.d.ts', '/creagen.js.map']
  return {
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (allowedPaths.includes(req.originalUrl)) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
          res.writeHead(200)
          return new Promise((resolve) => {
            fs.readFile(
              `${creagenDevPath}/dist/${req.originalUrl}`,
              (err, data) => {
                if (err) return console.error(err)
                res.write(data)
                res.end()
                resolve()
              },
            )
          })
        }

        next()
      })
    },
    name: 'creagen-library',
  }
}

function watchExternal() {
  return {
    name: 'watch-external',
    async buildStart() {
      const files = await fg([`${creagenDevPath}/src/**/*`])
      for (const file of files) {
        this.addWatchFile(file)
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.includes(creagenDevPath)) {
        server.ws.send({
          type: 'full-reload',
          path: '*',
        })
        return []
      }
    },
  }
}

function redirectController() {
  return {
    name: 'redirect-controller',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Match /controller/* but not the actual index.html file
        if (req.url.startsWith('/controller/') && !req.url.includes('.')) {
          req.url = '/controller/index.html'
        }
        next()
      })
    },
  }
}

function injectAnalytics(mode) {
  const analyticsScript =
    mode === 'production'
      ? '<script defer src="https://analytics.lyrx.dev/script.js" data-website-id="e9b1d776-a9fc-4d52-a9e1-18b80355b1ab"></script>'
      : ''

  return {
    name: 'inject-analytics',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (ctx.filename.includes('sandbox-runtime.html')) {
          return html
        }
        // Only process main index.html
        return html.replace('<%- analyticsScript %>', analyticsScript)
      },
    },
  }
}

const commitHeadFile = './.git/FETCH_HEAD'
function commitHash() {
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

let creagenDevPath = process.env.CREAGEN_DEV_PATH ?? path.resolve('../creagen')
if (!fs.existsSync(creagenDevPath)) {
  creagenDevPath = null
}
export default defineConfig(async ({ mode }) => {
  const defines = {
    CREAGEN_MODE: JSON.stringify(mode),
    // if dev, get version from local creagen package.json
    CREAGEN_DEV_VERSION: creagenDevPath
      ? JSON.stringify(
          JSON.parse(fs.readFileSync(`${creagenDevPath}/package.json`)).version,
        )
      : null,
    CREAGEN_EDITOR_VERSION: JSON.stringify(process.env.npm_package_version),
    CREAGEN_EDITOR_COMMIT_HASH: JSON.stringify(commitHash()),
    CREAGEN_EDITOR_CONTROLLER_URL: process.env.CREAGEN_EDITOR_CONTROLLER_URL
      ? JSON.stringify(process.env.CREAGEN_EDITOR_CONTROLLER_URL)
      : '"https://controller.creagen.dev"',
    CREAGEN_EDITOR_SANDBOX_RUNTIME_URL: process.env
      .CREAGEN_EDITOR_SANDBOX_RUNTIME_URL
      ? JSON.stringify(process.env.CREAGEN_EDITOR_SANDBOX_RUNTIME_URL)
      : JSON.stringify('/sandbox-runtime/'),
    CREAGEN_LOG_LEVEL: process.env.CREAGEN_LOG_LEVEL
      ? JSON.stringify(process.env.CREAGEN_LOG_LEVEL)
      : '"0"',
  }
  return {
    define: defines,
    test: {
      globals: true,
      environment: 'jsdom',
      define: defines,
    },
    build: {
      // don't include source maps to reduce upload size
      sourcemap: mode === 'dev',
      chunkSizeWarningLimit: 25 * 1000, // max 25mb for cloudflare pages
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        input: {
          ...(process.env.VITE_ENTRYPOINT === 'sandbox'
            ? { sandbox: path.resolve(__dirname, 'sandbox-runtime/index.html') }
            : {
                main: path.resolve(__dirname, 'index.html'),
                controller: path.resolve(__dirname, 'controller/index.html'),
              }),
        },
      },
    },
    server: {
      watch: {
        usePolling: true,
      },
    },
    plugins: [
      ...(creagenDevPath ? [localLibraryOnHttp(mode), watchExternal()] : []),
      // sandboxJs(mode),
      redirectController(),
      injectAnalytics(mode),
      react(),
    ],
  }
})
