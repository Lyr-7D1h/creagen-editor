import { rollup } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import { createHtmlPlugin } from 'vite-plugin-html'

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

  const allowedPaths = ['/creagen.js', '/creagen.d.ts', '/creagen.js.map']
  return {
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (allowedPaths.includes(req.originalUrl)) {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
          res.writeHead(200)
          res.write(
            fs.readFileSync(`${CREAGEN_DEV_PATH}/dist/${req.originalUrl}`),
          )
          res.end()
          return
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
      const files = await fg(['src/**/*', `${CREAGEN_DEV_PATH}/src/**/*`])
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

/** Parse `sandbox.ts` to a string import for `src/components/Sandbox` */
function sandboxJs(mode) {
  const inputPath = path.resolve('./sandbox.ts')
  const outputPath = path.resolve('gen/sandbox.ts')
  const tmpPath = path.resolve('./sandbox.tmp.js')
  fs.mkdirSync(path.resolve('gen'), { recursive: true })
  // prevent compile errors by creating sandbox.ts early
  fs.writeFileSync(outputPath, 'export default ""')
  const rollupConfig = {
    input: inputPath,
    output: {
      file: tmpPath,
      format: 'es',
      sourcemap: false,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        include: ['src/**/*', 'sandbox.ts', 'src/vite-env.d.ts'],
        compilerOptions: {
          target: 'ESNext',
          module: 'ESNext',
          moduleResolution: 'node',
          sourceMap: false,
          inlineSources: false,
          skipLibCheck: true,
          strict: false,
          noUnusedLocals: false,
          noImplicitAny: false,
          noImplicitReturns: false,
          esModuleInterop: true,
        },
      }),
      // don't minify in dev
      mode === 'dev'
        ? undefined
        : terser({
            compress: {
              keep_infinity: true,
              drop_console: true,
              drop_debugger: true,
            },
          }),
    ],
  }

  async function buildSandboxJs() {
    console.log(`${inputPath} -> ${tmpPath}`)
    const bundle = await rollup(rollupConfig)
    await bundle.write(rollupConfig.output)
    await bundle.close()

    const output = fs
      .readFileSync(tmpPath, 'utf-8')
      .replaceAll('`', '\\`')
      .replaceAll(/\${/g, '\\${')

    fs.writeFileSync(
      outputPath,
      `// THIS FILE IS AUTO GENERATED, DO NOT MODIFY
// generated from sandbox.ts
export default \`${output}\``,
    )

    console.log(`${tmpPath} -> ${outputPath}`)
    fs.unlinkSync(tmpPath)
  }

  return {
    name: 'sandbox-js',
    async buildStart() {
      buildSandboxJs()
    },
    handleHotUpdate({ file }) {
      if (file.includes('sandbox.ts') && !file.includes('gen/')) {
        buildSandboxJs()
      }
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

export default defineConfig(async ({ command, mode }) => {
  process.env = {
    ...process.env,
    ...loadEnv(mode, process.cwd()),
    VITE_CREAGEN_EDITOR_COMMIT_HASH: commitHash(),
    VITE_CREAGEN_EDITOR_VERSION: process.env.npm_package_version,
    VITE_DEBUG: mode === 'dev',
    // if dev, get version from local creagen package.json
    VITE_CREAGEN_DEV_VERSION: CREAGEN_DEV_PATH
      ? JSON.parse(fs.readFileSync(`${CREAGEN_DEV_PATH}/package.json`)).version
      : null,
  }

  return {
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
    },
    plugins: [
      ...(CREAGEN_DEV_PATH ? [localLibraryOnHttp(mode), watchExternal()] : []),
      sandboxJs(mode),
      react(),
      createHtmlPlugin({
        minify: mode === 'production',
        inject: {
          data: {
            analyticsScript:
              mode === 'production'
                ? '<script defer src="https://analytics.lyrx.dev/script.js" data-website-id="e9b1d776-a9fc-4d52-a9e1-18b80355b1ab"></script>'
                : '',
          },
        },
      }),
    ],
  }
})
