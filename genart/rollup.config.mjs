import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import { dts } from 'rollup-plugin-dts'

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/genart.js',
      format: 'es',
      name: 'genart',
      sourcemap: true,
    },
    plugins: [typescript({ noEmitOnError: false }), terser()],
  },
  {
    input: 'dist/types/index.d.ts',
    output: {
      name: 'genart',
      file: 'dist/genart.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
]
