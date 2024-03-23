import dts from 'dts-bundle'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

const bundlePath = path.resolve(__dirname, 'bundle.d.ts')

export function generateBundle() {
  dts.bundle({
    name: 'plart',
    main: '../plart/build/index.d.ts',
    out: bundlePath,
  })

  const declarations = fs.readFileSync(bundlePath).toString()
  const lines = declarations.split('\n')
  lines.splice(0, 2)
  fs.writeFileSync(
    path.resolve(__dirname, 'bundle.ts'),
    `export const bundleDefinitions = \`${lines.join('\n')}\``,
  )
  fs.rmSync(bundlePath)
}

export default defineConfig(async ({ command, mode }) => {
  return {
    plugins: [
      {
        name: 'generate-bundle',
        handleHotUpdate: async () => {
          generateBundle()
        },
        buildStart: async () => {
          generateBundle()
        },
      },
    ],
  }
})
