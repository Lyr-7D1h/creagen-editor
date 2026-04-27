# Parameters

Parameters are interactive controls for your sketch.

They let you change values like size, speed, color, text, or random seed without editing code each time.

## Why Use Parameters

Use parameters when you want to:

- explore many visual variations quickly
- tweak behavior live during demos or performances
- expose controls to non-coders
- control a sketch from your phone with the [Controller](https://creagen.dev/docs/editor/controller) page

## Basic Usage

Define a parameter in your sketch, then use its value in your drawing logic.

```ts
const size = useParam('float', {
  title: 'Size',
  min: 10,
  max: 300,
  step: 1,
  default: 120,
})

circle(centerX, centerY, size)
```

When you render, this appears in the Parameters panel automatically.

## Parameter Types

| Type | Returns (TypeScript) | Description | Options |
| --- | --- | --- | --- |
| `boolean` | `boolean` | Simple on/off switch | `title?`, `description?`, `default?` |
| `integer` | `number` | Whole number value. | `title?`, `description?`, `default?`, `min?`, `max?` |
| `float` | `number` | Decimal number value. | `title?`, `description?`, `default?`, `min?`, `max?`, `step?` |
| `text` | `string` | Free text input. | `title?`, `description?`, `default?` |
| `range` | `[number, number]` | Two-number range value. | `title?`, `description?`, `default?`, `min?`, `max?`, `step?` |
| `range-slider` | `[number, number]` | Two-handle slider range value. | `title?`, `description?`, `default?`, `min?`, `max?`, `step?` |
| `seed` | `() => number` | Random number generator generated from a given seed. | `title?`, `description?`, `default?` (`string`) |
| `radio` | `Items[keyof Items]` | One choice from named options. | `title?`, `description?`, `items` (required), `default?`, `columns?` |
| `color` | `string` (default) or `number` (`format: 'number'`) | Color picker value. | `title?`, `description?`, `default?`, `format?` (`'hex'` \| `'number'`) |

## Examples

### Toggle a grid

```ts
const showGrid = useParam('boolean', { title: 'Grid', default: false })
if (showGrid) drawGrid()
```

### Pick one style with radio buttons

```ts
const mode = useParam('radio', {
  title: 'Mode',
  items: {
    Lines: 'lines',
    Dots: 'dots',
    Blocks: 'blocks',
  },
  default: 'dots',
})
```

### Control randomness with seed

```ts
const random = useParam('seed', { title: 'Seed' })
const x = random() * width
```

## Parameter Panel Tips

- Use **Randomize all** to randomize all given parameters within their bounds
- Use **Reset to defaults** to go back to the `default` set on each parameter
- Enable **Auto render on parameter change** for immediate visual feedback after changing each parameter. Should be enabled if you want to re-render for a parameter change caused by a  [Controller](./controller.md).
- Use **Compact layout** if you have many controls.

## Good Defaults

Clear defaults make sketches feel better to use.

- Set `title` so controls are readable.
- Use `min` and `max` for numeric safety.
- Use a realistic `default` that produces a pleasing first render.
- Keep names short and intention-focused.
