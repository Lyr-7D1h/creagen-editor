export interface LibraryConfig {
  /** overwrite types of package with a specific type package */
  typingsOverwrite?: string
  typingsPathOverwrite?: string
  forceReload?: boolean
  template?: string
}

export const LIBRARY_CONFIGS: Record<string, LibraryConfig> = {
  '@types/p5': {
    typingsPathOverwrite: 'global.d.ts',
  },
  p5: {
    // Using p5 with global types
    typingsOverwrite: '@types/p5',
    template: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  line(0, 0, 50, 50)
}`,
  },
  creagen: {
    template: `import { Canvas, vec, load, color } from "creagen";

const canvas = Canvas.create({ width: 400, height: 400 })
canvas.background(color(220))
canvas.line(vec(0, 0), vec(50, 50))

load(canvas)`,
  },
}
