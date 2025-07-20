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

- Shareable links without storage
  - Option to put the code in the url instead of the id
- Export to html with js inlined
- Add Hydra support https://github.com/hydra-synth/hydra-synth?tab=readme-ov-file
- use importmap to map module names to urls https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
- Dynamically add npm packages
- Download canvas as png
- Improved storage
  - Fastcdc for file chunking https://www.usenix.org/system/files/conference/atc16/atc16-paper-xia.pdf
  - git pack files
  - Cloudflare r2
- Project management
  - List sketches
  - Name sketches (aliases to a hash, similar to git branches)
  - View history of sketch
- Import code using ID `import('a123487e...')
- Crop, compress and convert dropped images to base64 string
- Html meta tags
- use hash in title

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
