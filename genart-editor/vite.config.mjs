import fg from 'fast-glob'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import { packages } from './package-lock.json'

// const LIBRARY_TYPE_DEFINITIONS_PATH = '../genart/dist/types/index.d.ts'
// const LIBRARY_TYPE_DEFINTIONS_OUTPUT = path.resolve(__dirname, 'bundle.ts')

// export function generateTypeDefinitions() {
//   const tmp = `${LIBRARY_TYPE_DEFINTIONS_OUTPUT}.tmp`
//   dts.bundle({
//     name: 'genart',
//     main: LIBRARY_TYPE_DEFINITIONS_PATH,
//     out: tmp,
//     outputAsModuleFolder: false,
//   })

//   const declarations = fs.readFileSync(tmp).toString()

//   const match = declarations.matchAll(/declare module '(.*\/(.*))'/gm)
//   const namespaces = []
//   for (const m of match) {
//     namespaces.push(`namespace ${m[2]} {
//     export * from "${m[1]}"
// }`)
//   }

//   // const lines = declarations.split('\n')
//   // lines.splice(0, 2)
//   // TODO: delete global module declaration
//   fs.writeFileSync(
//     path.resolve(__dirname, 'bundle.ts'),
//     `export const bundleDefinitions = \`${declarations}\n${namespaces.join('\n')}\``,
//   )
//   fs.rmSync(tmp)
// }

const LIBRARY_TYPE_DEFINITIONS_PATH = '../genart/dist/genart.d.ts'
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

export default defineConfig(async ({ command, mode }) => {
  process.env = {
    ...process.env,
    ...loadEnv(mode, process.cwd()),
    VITE_DEBUG: true,
    VITE_GENART_EDITOR_VERSION: process.env.npm_package_version,
    VITE_GENART_VERSION: packages['node_modules/@lyr_7d1h/genart'].version,
  }

  return {
    plugins: [
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
        name: 'watch-external', // https://stackoverflow.com/questions/63373804/rollup-watch-include-directory/63548394#63548394
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
