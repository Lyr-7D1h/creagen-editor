import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/genart.js',
    format: 'es',
    name: 'genart',
    sourcemap: true,
  },
  plugins: [typescript({ noEmitOnError: false }), terser()],
}
