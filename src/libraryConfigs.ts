export interface LibraryConfig {
  typingsOverwrite?: string
  forceReload?: boolean
  template?: string
}

export const LIBRARY_CONFIGS: Record<string, LibraryConfig> = {
  p5: {
    // Using p5 with global types
    typingsOverwrite: 'global.d.ts',
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

const canvas = Canvas.create(400, 400)
canvas.background(color(220))
canvas.line(vec(0, 0), vec(50, 50))

load(canvas)`,
  },
}
