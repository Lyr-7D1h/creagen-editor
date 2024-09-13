import fg from 'fast-glob'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import { packages } from './package-lock.json'

const LIBRARY_PATH = '../genart'
const LIBRARY_TYPE_DEFINITIONS_PATH = `${LIBRARY_PATH}/dist/genart.d.ts`
const LIBRARY_TYPE_DEFINTIONS_OUTPUT = path.resolve(
  __dirname,
  'genartTypings.ts',
)
function generateTypeDefinitions() {
  const typings = fs.readFileSync(LIBRARY_TYPE_DEFINITIONS_PATH).toString()
  fs.writeFileSync(
    LIBRARY_TYPE_DEFINTIONS_OUTPUT,
    `export const genartTypings = \`${typings}\``,
  )
}

/** Serve local build of genart library */
function localLibrary() {
  return {
    apply: 'serve',
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          console.log(req.originalUrl)
          if (req.originalUrl === '/genart.js') {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
            res.writeHead(200)
            res.write(
              fs.readFileSync(
                path.join(__dirname, `${LIBRARY_PATH}/dist/genart.js`),
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
    plugins: [
      localLibrary(),
      {
        name: 'generate-bundle',
        handleHotUpdate: async () => {
          generateTypeDefinitions()
        },
        buildStart: async () => {
          generateTypeDefinitions()
        },
      },
      {
        name: 'watch-external',
        async buildStart() {
          const files = await fg(['src/**/*', '../genart/src/**/*'])
          for (const file of files) {
            this.addWatchFile(file)
          }
        },
      },
    ],
  }
})
