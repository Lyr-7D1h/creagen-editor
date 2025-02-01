import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import { dts } from 'rollup-plugin-dts'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/creagen.js',
      format: 'es',
      name: 'creagen',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({ noEmitOnError: false }),
      terser(),
    ],
  },
  {
    input: 'dist/types/index.d.ts',
    output: {
      name: '@lyr_7d1h/creagen',
      file: 'dist/creagen.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
]
