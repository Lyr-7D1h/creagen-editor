import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/plart.js',
    format: 'es',
    name: 'plart',
    sourcemap: true,
  },
  plugins: [
    typescript(),
    terser(), // Optionally, for minification
  ],
}
