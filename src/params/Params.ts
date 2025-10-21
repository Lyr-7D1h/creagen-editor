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
      default: z.number().optional().default(0),
      min: z.number().optional().default(0),
      max: z.number().optional().default(10),
      step: z.number().optional(),
    })
    .refine((data) => data.min <= data.max, {
      message: 'min cannot be greater than max',
    }),
  baseConfigSchema.extend({
    type: z.literal('text'),
    default: z.string().optional().default(''),
  }),
  baseConfigSchema
    .extend({
      type: z.literal('range'),
      default: z.tuple([z.number(), z.number()]).optional().default([0, 10]),
      min: z.number().optional().default(0),
      max: z.number().optional().default(10),
      step: z.number().optional().default(1),
    })
    .refine((data) => data.min <= data.max, {
      message: 'min cannot be greater than max',
    }),
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
  text: string
  range: [number, number]
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
declare function useParam(type: 'text', options?: Omit<Extract<ParamConfig, { type: 'text' }>, 'type'>): string;
declare function useParam(type: 'range', options: Omit<Extract<ParamConfig, { type: 'range' }>, 'type'>): [number, number];
declare function useParam(type: 'seed', options?: Omit<Extract<ParamConfig, { type: 'seed' }>, 'type'>): () => number;
declare function useParam<Items extends Record<string, any>>(
  type: 'radio',
  options: Omit<Extract<ParamConfig, { type: 'radio' }>, 'type'> & { items: Items }
): Items[keyof Items];
` /** key: [ParamConfig, value] */
  private store: Record<ParamKey, [ParamConfig, unknown]> = {}
  private previousValues: Map<ParamKey, unknown> = new Map()

  getAll(): AllParams {
    return Object.entries(this.store).map(([key, [config, value]]) => [
      key as ParamKey,
      config,
      value,
    ])
  }

  setValue(key: ParamKey, newValue: unknown): void {
    if (this.store[key]) {
      this.store[key][1] = newValue
    }
  }

  /**
   * Clear all parameters from the store while preserving their values
   * This should be called before parsing code to remove unused params
   */
  clearAndPreserveValues(): void {
    // Save current values
    this.previousValues = new Map(
      Object.entries(this.store).map(([key, [_config, value]]) => [
        key as ParamKey,
        value,
      ]),
    )
    // Clear the store
    this.store = {}
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

    const stored = this.store[key]
    const previousValue = this.previousValues.get(key)

    const value = (
      typeof stored !== 'undefined'
        ? stored[1]
        : previousValue !== undefined
          ? previousValue
          : 'default' in config
            ? config.default
            : null
    ) as unknown

    this.store[key] = [config, value]

    return this.translate(config, value as ValueFromConfig<T>)
  }

  private translate<T extends ParamConfig>(
    config: T,
    value: ValueFromConfig<T>,
  ): string {
    switch (config.type) {
      case 'boolean':
        return String(value)
      case 'number':
        return String(value)
      case 'text':
        return JSON.stringify(value)
      case 'range':
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
