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
  private store: Map<ParamKey, [ParamConfig, unknown]> = new Map()
  private previousValues: Map<ParamKey, unknown> = new Map()

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
        // Check min/max constraints
        return value >= config.min && value <= config.max

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

  forEach(cb: (v: [ParamConfig, unknown], k: ParamKey) => void) {
    this.store.forEach(cb)
  }

  entries() {
    return this.store.entries()
  }

  setValue(key: ParamKey, newValue: unknown): void {
    const v = this.store.get(key)
    if (v) {
      v[1] = newValue
    }
  }

  /**
   * Clear all parameters from the store while preserving their values
   * This should be called before parsing code to remove unused params
   */
  clearAndPreserveValues(): void {
    // Save current values
    this.previousValues = new Map(
      [...this.store.entries()].map(([key, [_config, value]]) => [key, value]),
    )
    // Clear the store
    this.store = new Map()
  }

  addParam<T extends ParamConfig>(config: T) {
    // Generate a human-readable key based on title or type
    const baseKey = config.title ?? config.type
    let key = baseKey as ParamKey

    // If key already exists, append incrementing number
    let counter = 1
    while (key in this.store) {
      key = `${baseKey}_${counter}` as ParamKey
      counter++
    }

    const stored = this.store.get(key)
    if (stored) {
      const [config, value] = stored
      return this.translate(config, value)
    }

    const previousValue = this.previousValues.get(key)

    // Use previousValue if valid, otherwise use default
    const value: ValueFromConfig<T> = (
      previousValue !== undefined && Params.isValidValue(config, previousValue)
        ? previousValue
        : config.default
    ) as ValueFromConfig<T>

    this.store.set(key, [config, value])

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

export type ParamKey = Tagged<string, 'paramKey'>
