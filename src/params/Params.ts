import { z } from 'zod'
import { Tagged } from '../util'
import { generateHumanReadableName } from '../vcs/generateHumanReadableName'

// https://muffinman.io/ctrls/#/animate:true/opacity-seed:knew-except-fence/hue:220/speed:2/shape:6/size:0,1

const baseConfigSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
})

export const paramConfigSchema = z.discriminatedUnion('type', [
  baseConfigSchema.extend({
    type: z.literal('boolean'),
    default: z.boolean().optional().default(false),
  }),
  baseConfigSchema
    .extend({
      type: z.literal('number'),
      default: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
    })
    .refine(
      (data) =>
        // TODO: fix don't do min max
        typeof data.min !== 'undefined' && typeof data.max !== 'undefined'
          ? data.min <= data.max
          : true,
      {
        message: 'min cannot be greater than max',
      },
    )
    .transform((data) => ({
      ...data,
      default: data.default ?? data.min,
    })),
  baseConfigSchema
    .extend({
      type: z.literal('number-slider'),
      default: z.number().optional(),
      min: z.number().optional().default(0),
      max: z.number().optional().default(10),
      step: z.number().optional(),
    })
    .refine((data) => data.min <= data.max, {
      message: 'min cannot be greater than max',
    })
    .transform((data) => ({
      ...data,
      default: data.default ?? data.min,
    })),
  baseConfigSchema.extend({
    type: z.literal('text'),
    default: z.string().optional().default(''),
  }),
  baseConfigSchema
    .extend({
      type: z.literal('range'),
      default: z.tuple([z.number(), z.number()]).optional(),
      min: z.number().optional().default(0),
      max: z.number().optional().default(10),
      step: z.number().optional().default(1),
    })
    .refine((data) => data.min <= data.max, {
      message: 'min cannot be greater than max',
    })
    .transform((data) => ({
      ...data,
      default: data.default ?? [data.min, data.max],
    })),
  baseConfigSchema
    .extend({
      type: z.literal('range-slider'),
      default: z.tuple([z.number(), z.number()]).optional(),
      min: z.number().optional().default(0),
      max: z.number().optional().default(10),
      step: z.number().optional().default(1),
    })
    .refine((data) => data.min <= data.max, {
      message: 'min cannot be greater than max',
    })
    .transform((data) => ({
      ...data,
      default: data.default ?? [data.min, data.max],
    })),
  baseConfigSchema.extend({
    type: z.literal('seed'),
    default: z
      .any()
      .optional()
      .default(() => generateHumanReadableName()),
  }),
  baseConfigSchema
    .extend({
      type: z.literal('radio'),
      default: z.unknown().optional(),
      items: z
        .record(z.string(), z.unknown())
        .refine((items) => Object.keys(items).length >= 1, {
          message: 'items must have at least one entry',
        }),
      columns: z.number().positive().optional(),
    })
    .refine(
      (data) => {
        if (data.default === undefined) return true
        // Check if default is one of the item values (not keys)
        return Object.values(data.items).includes(data.default)
      },
      {
        message: 'default must be one of the item values',
      },
    ),
])

export type ParamConfig = z.infer<typeof paramConfigSchema>

export type ParamConfigType = ParamConfig['type']

type ParamConfigValueMap = {
  boolean: boolean
  number: number
  'number-slider': number
  text: string
  range: [number, number]
  'range-slider': [number, number]
  seed: string
  radio: string
  /** a function as a string */
  function: string
}
export type ParamConfigValue<K extends ParamConfigType> =
  K extends keyof ParamConfigValueMap ? ParamConfigValueMap[K] : never

// Helper to get value type from config
export type ValueFromConfig<T extends ParamConfig> = T extends {
  type: 'radio'
  items: infer Items
}
  ? Items extends Record<string, infer V>
    ? V
    : never
  : T extends { type: infer K }
    ? K extends ParamConfigType
      ? ParamConfigValue<K>
      : never
    : never

export type AllParams = Array<[ParamKey, ParamConfig, unknown]>

export class Params {
  static TYPINGS = `
type ParamConfig = { title?: string; description?: string } & (
  | {
      type: 'boolean'
      default?: boolean
    }
  | {
      type: 'number'
      default?: number
      min?: number
      max?: number
      step?: number
    }
  | {
      type: 'number-slider'
      default?: number
      min?: number
      max?: number
      step?: number
    }
  | { 
      type: 'text'
      default?: string 
    }
  | {
      type: 'range'
      default?: [number, number]
      min?: number
      max?: number
      step?: number
    }
  | {
      type: 'range-slider'
      default?: [number, number]
      min?: number
      max?: number
      step?: number
    }
  | {
      /** Returns () => () => number where number is between [0-1] */
      type: 'seed'
      default?: string
    }
  | {
      type: 'radio'
      /** If provided, must be one of the item values (not keys) */
      default?: any
      /** Must have at least one entry */
      items: Record<string, any>
      /** Must be a positive non-zero number */
      columns?: number
    }
)

// Overloaded function signatures
declare function useParam(type: 'boolean', options?: Omit<Extract<ParamConfig, { type: 'boolean' }>, 'type'>): boolean;
declare function useParam(type: 'number', options?: Omit<Extract<ParamConfig, { type: 'number' }>, 'type'>): number;
declare function useParam(type: 'number-slider', options?: Omit<Extract<ParamConfig, { type: 'number-slider' }>, 'type'>): number;
declare function useParam(type: 'text', options?: Omit<Extract<ParamConfig, { type: 'text' }>, 'type'>): string;
declare function useParam(type: 'range', options: Omit<Extract<ParamConfig, { type: 'range' }>, 'type'>): [number, number];
declare function useParam(type: 'range-slider', options: Omit<Extract<ParamConfig, { type: 'range-slider' }>, 'type'>): [number, number];
declare function useParam(type: 'seed', options?: Omit<Extract<ParamConfig, { type: 'seed' }>, 'type'>): () => number;
declare function useParam<Items extends Record<string, any>>(
  type: 'radio',
  options: Omit<Extract<ParamConfig, { type: 'radio' }>, 'type'> & { items: Items }
): Items[keyof Items];
` /** key: [ParamConfig, value] */
  private previousStore: Map<ParamKey, unknown> = new Map()
  readonly store: Map<ParamKey, unknown> = storeFromQueryParam()
  readonly configs: Map<ParamKey, ParamConfig> = new Map()

  get length(): number {
    return this.store.size
  }

  /**
   * Validates that a value meets the constraints of its param config.
   * Returns true if valid, false otherwise.
   */
  static isValidValue(config: ParamConfig, value: unknown): boolean {
    switch (config.type) {
      case 'boolean':
        return typeof value === 'boolean'

      case 'number':
      case 'number-slider':
        if (typeof value !== 'number' || isNaN(value)) {
          return false
        }
        if (
          typeof config.min !== 'undefined' &&
          typeof config.max !== 'undefined'
        )
          // Check min/max constraints
          return value >= config.min && value <= config.max
        if (typeof config.min !== 'undefined') return value >= config.min
        if (typeof config.max !== 'undefined') return value >= config.max
        return true
      case 'text':
        return typeof value === 'string'

      case 'range':
      case 'range-slider': {
        if (!Array.isArray(value) || value.length !== 2) {
          return false
        }
        const [min, max] = value as [unknown, unknown]
        if (
          typeof min !== 'number' ||
          typeof max !== 'number' ||
          isNaN(min) ||
          isNaN(max)
        ) {
          return false
        }
        // Check constraints: values must be within bounds and min <= max
        return min >= config.min && max <= config.max && min <= max
      }

      case 'seed':
        return typeof value === 'string'

      case 'radio':
        // Check if value is one of the valid item values
        return Object.values(config.items).includes(value)
    }
  }

  save() {
    if (this.length === 0) return
    const url = new URL(window.location.href)
    const queryParam = storeToQueryParam(this.store)
    url.searchParams.set('param', queryParam)
    window.history.replaceState(null, '', url)
  }

  setValue(key: string, newValue: unknown): void {
    const k = key as ParamKey
    if (!this.store.has(k)) return
    this.store.set(k, newValue)
    this.save()
  }

  /**
   * Clear all parameters from the store while preserving their values
   * This should be called before parsing code to remove unused params
   */
  clearAndPreserveValues(): void {
    // Save current values
    this.previousStore = new Map(this.store)

    // Clear the store adn and configs
    this.store.clear()
    this.configs.clear()
  }

  addParam<T extends ParamConfig>(config: T) {
    // Generate a human-readable key based on title or type
    const baseKey = config.title ?? config.type
    let key = baseKey as ParamKey

    // If key already exists, append incrementing number
    let counter = 1
    while (this.store.has(key)) {
      key = `${baseKey}_${counter}` as ParamKey
      counter++
    }

    const stored = this.store.get(key)
    // use stored value only if it exists and is valid for the config
    if (stored !== undefined && Params.isValidValue(config, stored)) {
      this.configs.set(key, config)
      return this.translate(config, stored as ValueFromConfig<T>)
    }

    const previousValue = this.previousStore.get(key)

    // Use previousValue if valid, otherwise use default
    const value: ValueFromConfig<T> = (
      previousValue !== undefined && Params.isValidValue(config, previousValue)
        ? previousValue
        : config.default
    ) as ValueFromConfig<T>

    this.store.set(key, value)
    this.configs.set(key, config)

    return this.translate(config, value)
  }

  private translate<T extends ParamConfig>(
    config: T,
    value: ValueFromConfig<T>,
  ): string {
    switch (config.type) {
      case 'boolean':
        return String(value)
      case 'number':
      case 'number-slider':
        return String(value)
      case 'text':
        return JSON.stringify(value)
      case 'range':
      case 'range-slider':
        return JSON.stringify(value)
      case 'seed': {
        const seed = hashStringTou32(value as string)
        // translate to a simple xorshift with given seed
        return `(() => {
          let __CREAGEN_SEED__ = ${seed} ?? 2463534242
          return () => {
            __CREAGEN_SEED__ ^= __CREAGEN_SEED__ << 13
            __CREAGEN_SEED__ ^= __CREAGEN_SEED__ >> 17
            __CREAGEN_SEED__ ^= __CREAGEN_SEED__ << 5
            return (__CREAGEN_SEED__ >>> 0) / 4294967296
          }
        })()`
      }
      case 'radio': {
        return JSON.stringify(value)
      }
    }
  }
}

function hashStringTou32(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash >>> 0 // Convert to unsigned 32-bit integer
  }
  return hash
}
function storeFromQueryParam(): Store {
  const urlParams = new URLSearchParams(window.location.search)
  const urlParam = urlParams.get('param')
  if (urlParam == null) return new Map()

  const parsed: Store = new Map()
  let k = ''
  let v = ''
  let key = true
  let quoted = false
  for (const c of urlParam) {
    if (!key && !quoted && c === '~') {
      parsed.set(k as ParamKey, JSON.parse(v))
      k = ''
      v = ''
      key = true
      continue
    } else if (!quoted && key && c === '.') {
      key = false
      continue
    }

    // ensure to not use any characters inside of quotes
    if (c === '"') {
      quoted = !quoted
    }

    if (key) {
      k += c
    } else {
      v += c
    }
  }
  if (k.length > 0) parsed.set(k as ParamKey, JSON.parse(v))

  return parsed
}
function storeToQueryParam(store: Store) {
  return Array.from(store.entries())
    .map(([key, val]) => `${String(key)}.${JSON.stringify(val)}`)
    .join('~')
}

export type ParamKey = Tagged<string, 'paramKey'>
type Store = Map<ParamKey, unknown>
