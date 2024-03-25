import dts from 'dts-bundle'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

const LIBRARY_TYPE_DEFINITIONS_PATH = '../library/dist/build/index.d.ts'
const LIBRARY_TYPE_DEFINTIONS_OUTPUT = path.resolve(__dirname, 'bundle.d.ts')

export function generateTypeDefinitions() {
  dts.bundle({
    name: 'plart',
    main: LIBRARY_TYPE_DEFINITIONS_PATH,
    out: LIBRARY_TYPE_DEFINTIONS_OUTPUT,
    // outputAsModuleFolder: true,
  })

  let declarations = fs.readFileSync(LIBRARY_TYPE_DEFINTIONS_OUTPUT).toString()

  const match = declarations.matchAll(/declare module .*\/(.*)'/gm)
  for (const m of match) {
    declarations = declarations.replace(m[0], `namespace ${m[1]}`)
  }

  const lines = declarations.split('\n')
  lines.splice(0, 2)
  // TODO: delete global module declaration
  fs.writeFileSync(
    path.resolve(__dirname, 'bundle.ts'),
    `export const bundleDefinitions = \`${lines.join('\n')}\``,
  )
  fs.rmSync(LIBRARY_TYPE_DEFINTIONS_OUTPUT)
}

export default defineConfig(async ({ command, mode }) => {
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
    ],
  }
})
