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
# `CREAGEN_DEV_PATH`  - path to creagen library folder (defaults to ../creagen)
# The full path to the package will be `$CREAGEN_DEV_PATH/dist/creagen.js`
CREAGEN_DEV_PATH=<path to local creagen version> npm run dev

# Run in standalone mode
npm start
```

## Roadmap

- Add docs
- Add way to view and edit code on mobile
- Put url in svg export
- Add caching of package information to Imported
- Remote mode
  - Show two storage bars, one locally cached, one remote
- Hybrid Mode: Remote enabled build that handles local changes well
  - Sync local changes the moment editor gets back online
  - Handle merge conflicts
- Feature to resize code to editor view size
- Generate controller id from unique browser id
- Improve parameters
  - Define how to randomize each param and what distribution the randomization should be. 
      - Add randomize interval.
  - Add sketch params
    - Randomize params in interval
    - Define distribution randomization distribution per param
    - Add groups 
      ```
      const asdf = useGroup("asdf") 
      const title = asdf.useParam("string")
      ```
    - Input mathematical functions
    - Input colors
    - Input images
    - Set values through a QR
    - Use /#/params in path for defining params
- Version Control Software
  - Order bookmarks by recently used
  - View entire history of sketch
  - Show diffs between commits
- Live coding, no delay in updates
- Export to html with js inlined
- Add Hydra support https://github.com/hydra-synth/hydra-synth?tab=readme-ov-file
- Download canvas as png
- Import code from another sketch using hash `import('a123487e...')
- Crop, compress and convert dropped images to base64 string
  - https://base64.guru/converter/encode/image/png

## Useful links
PNG to Base64:
https://base64.guru/converter/encode/image/png

Sanitize svg's:
https://www.svgviewer.dev
