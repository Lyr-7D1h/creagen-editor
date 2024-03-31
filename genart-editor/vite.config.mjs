import dts from 'dts-bundle'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import { packages } from './package-lock.json'

const LIBRARY_TYPE_DEFINITIONS_PATH = '../genart/dist/build/index.d.ts'
const LIBRARY_TYPE_DEFINTIONS_OUTPUT = path.resolve(__dirname, 'bundle.ts')

const CONSTANTS_OUTPUT = path.resolve(__dirname, 'constants.ts')

export function generateConstants() {
  fs.writeFileSync(
    CONSTANTS_OUTPUT,
    `export const GENART_EDITOR_VERSION = '${process.env.npm_package_version}'
export const GENART_VERSION = '${packages['node_modules/@lyr_7d1h/genart'].version}'`,
  )
}

export function generateTypeDefinitions() {
  const tmp = `${LIBRARY_TYPE_DEFINTIONS_OUTPUT}.tmp`
  dts.bundle({
    name: 'genart',
    main: LIBRARY_TYPE_DEFINITIONS_PATH,
    out: tmp,
    // outputAsModuleFolder: true,
  })

  let declarations = fs.readFileSync(tmp).toString()

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
  fs.rmSync(tmp)
}

export default defineConfig(async ({ command, mode }) => {
  generateConstants()

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
