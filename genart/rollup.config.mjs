import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import { dts } from 'rollup-plugin-dts'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/genart.js',
      format: 'es',
      name: 'genart',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({ noEmitOnError: false }),
      terser(),
    ],
    sourcemap: true,
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
