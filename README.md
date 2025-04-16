# Creagen

# Usage

```sh
npm install

# Run with local creagen build
# `CREAGEN_PATH`  - path to creagen library folder (defaults to ../creagen)
# The full path to the package will be `$CREAGEN_PATH/dist/creagen.js`
CREAGEN_PATH=<path to local creagen version> npm run dev

# Run in standalone mode
npm start
```

# Roadmap

- use importmap to map module names to urls https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
- qp5.js
- Project management
  - List sketches
  - Name sketches (aliases to a hash, similar to git branches)
  - View history of sketch
- Import code using ID `import('a123487e...')
- Crop, compress and convert dropped images to base64 string
- P5 support
- Make Settings moveable
- Typescript support
- Show only sandbox keybind/setting
- Html meta tags
- Autoimport libraries 
  - Import typings from npm https://lukasbach.github.io/monaco-editor-auto-typings/docs/

## Library:

- Reduce svg size (https://www.svgviewer.dev/)
- Treat svg paths as vertex (https://baku89.github.io/pave/guide.html) and allow linear operations on it
- Gcode support

# Resources
**Library**
- https://github.com/anvaka/fieldplay
Math:
- https://mathjs.org/docs/reference/functions.html#matrix-functions
- http://sylvester.jcoglan.com/api/vector.html#create
- https://github.com/scijs/ndarray

**Reading**
- https://en.wikipedia.org/wiki/Tessellation
- https://en.wikipedia.org/wiki/Random_walk
- https://en.wikipedia.org/wiki/Loop-erased_random_walk
- http://xahlee.info/math/algorithmic_math_art.html
- https://en.wikipedia.org/wiki/OpenSimplex_noise

# Useful urls
PNG to Base64:
https://base64.guru/converter/encode/image/png
Sanitize svg's:
https://www.svgviewer.dev
