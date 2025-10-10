# Creagen Editor

A creative coding web editor with focus on being locally available, minimal, customizable, fast and powerful. Its goal is to provide easy accessibility to make creative coding projects. 

Features:

- Npm support with typed packages
- Custom version management (specifically made to easily remember sketches and different iterations)
- Easy and customizable shortcuts
- Shareable links

## Usage

```sh
npm install

# Run with local creagen build
# `CREAGEN_PATH`  - path to creagen library folder (defaults to ../creagen)
# The full path to the package will be `$CREAGEN_PATH/dist/creagen.js`
CREAGEN_PATH=<path to local creagen version> npm run dev

# Run in standalone mode
npm start
```

## Roadmap

- Use hash/active bookmark in title
- Keep commit history buffer when changing commits
- Version Control Software
  - Order bookmarks by recently used
  - View entire history of sketch
  - Show graph of all commits and bookmarks ever made
  - Change id to keep a unique id even though commits might change content
  - Show diffs between commits
- Moveable and rescalable windows
- Shareable links
    - Url minifier for code urls
- Actions
    - For shareable link
- Autorun sketches
    - containerize iframe 
    - prevent iframe from hogging all resources
- Add sketch params
  - Add dynamically
  - Input mathematical functions
- Export to html with js inlined
- Add Hydra support https://github.com/hydra-synth/hydra-synth?tab=readme-ov-file
- use importmap to map module names to urls https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
- Dynamically add npm packages
- Download canvas as png
- Remote storage
  - Fastcdc for file chunking https://www.usenix.org/system/files/conference/atc16/atc16-paper-xia.pdf
  - git pack files
  - Cloudflare r2
- Import code using ID `import('a123487e...')
- Crop, compress and convert dropped images to base64 string
- Html meta tags

## Known bugs
- Old bookmarks not going away: When renaming bookmark update history

## Useful links
PNG to Base64:
https://base64.guru/converter/encode/image/png

Sanitize svg's:
https://www.svgviewer.dev
