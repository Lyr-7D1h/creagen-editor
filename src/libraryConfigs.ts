export interface LibraryConfig {
  typingsOverwrite?: string
  forceReload?: boolean
  template?: string
}

export const LIBRARY_CONFIGS: Record<string, LibraryConfig> = {
  p5: {
    // Using p5 with global types
    typingsOverwrite: 'global.d.ts',
    forceReload: true,
    template: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
}`,
  },
  creagen: {
    template: '',
    forceReload: false,
  },
}
