import fg from 'fast-glob'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import react from '@vitejs/plugin-react'

let CREAGEN_DEV_PATH = process.env.CREAGEN_PATH ?? path.resolve('../creagen')
if (!fs.existsSync(CREAGEN_DEV_PATH)) {
  CREAGEN_DEV_PATH = null
}

/** Serve local build of creagen library */
function localLibraryOnHttp(mode) {
  // don't load if not dev
  if (mode !== 'dev') return {}

  const allowedPaths = ['/creagen.mjs', '/creagen.d.ts', '/creagen.mjs.map']
  return {
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (allowedPaths.includes(req.originalUrl)) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
          res.writeHead(200)
          return new Promise((resolve) => {
            fs.readFile(
              `${CREAGEN_DEV_PATH}/dist/${req.originalUrl}`,
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
      const files = await fg([`${CREAGEN_DEV_PATH}/src/**/*`])
      for (const file of files) {
        this.addWatchFile(file)
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.includes(CREAGEN_DEV_PATH)) {
        server.ws.send({
          type: 'full-reload',
          path: '*',
        })
        return []
      }
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
        // Only process main index.html, not sandbox
        if (ctx.filename.includes('sandbox-runtime')) {
          return html
        }
        return html.replace('<%- analyticsScript %>', analyticsScript)
      },
    },
  }
}

function commitHash() {
  const head = fs.readFileSync('./.git/FETCH_HEAD', 'utf-8')
  for (const line of head.split('\n')) {
    const [commit, _, __, branch] = line.split(/ |\t+/)
    if (branch && branch.replaceAll("'", '') === 'master') {
      return commit
    }
  }
  console.warn('No commit hash found')
  return null
}

export default defineConfig(async ({ mode }) => {
  return {
    define: {
      CREAGEN_MODE: JSON.stringify(mode),
      // if dev, get version from local creagen package.json
      CREAGEN_DEV_VERSION: CREAGEN_DEV_PATH
        ? JSON.stringify(
            JSON.parse(fs.readFileSync(`${CREAGEN_DEV_PATH}/package.json`))
              .version,
          )
        : null,
      CREAGEN_EDITOR_VERSION: JSON.stringify(process.env.npm_package_version),
      CREAGEN_EDITOR_COMMIT_HASH: JSON.stringify(commitHash()),
      CREAGEN_EDITOR_SANDBOX_RUNTIME_URL: JSON.stringify('/sandbox-runtime/'),
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
          main: path.resolve(__dirname, 'index.html'),
          sandbox: path.resolve(__dirname, 'sandbox-runtime/index.html'),
        },
      },
    },
    server: {
      watch: {
        usePolling: true,
      },
    },
    plugins: [
      ...(CREAGEN_DEV_PATH ? [localLibraryOnHttp(mode), watchExternal()] : []),
      // sandboxJs(mode),
      injectAnalytics(mode),
      react(),
    ],
  }
})
