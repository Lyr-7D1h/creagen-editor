import { z } from 'zod'
import { isMobile } from '../creagen-editor/isMobile'
import { semverSchema } from '../creagen-editor/schemaUtils'

// eslint-disable-next-line react-refresh/only-export-components
export const librarySchema = z.object({
  name: z.string(),
  version: semverSchema,
})
export type Library = z.infer<typeof librarySchema>

// Base config schema
const baseSettingConfigSchema = z.object({
  label: z.string().optional(),
  details: z.string().optional(),
  hidden: z.boolean().optional(),
  readonly: z.boolean().optional(),
})

// Setting config schema with discriminated union
export const settingConfigSchema = z.discriminatedUnion('type', [
  // Boolean setting
  baseSettingConfigSchema.extend({
    type: z.literal('boolean'),
    default: z.boolean().optional().default(false),
    validate: z.any().optional(),
  }),

  // Number setting
  baseSettingConfigSchema
    .extend({
      type: z.literal('number'),
      default: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      validate: z.any().optional(),
    })
    .refine(
      (data) =>
        typeof data.min !== 'undefined' && typeof data.max !== 'undefined'
          ? data.min <= data.max
          : true,
      {
        message: 'min cannot be greater than max',
      },
    )
    .transform((data) => ({
      ...data,
      default: data.default ?? data.min ?? 0,
    })),

  // String setting
  baseSettingConfigSchema.extend({
    type: z.literal('string'),
    default: z.string().optional().default(''),
    validate: z.any().optional(),
  }),

  // Folder (group of settings)
  z.object({
    type: z.literal('folder'),
    title: z.string(),
    hidden: z.boolean().optional(),
  }),

  // Button action
  z.object({
    type: z.literal('button'),
    title: z.string(),
    onClick: z.any(),
  }),

  // Query param (state not stored in localStorage)
  baseSettingConfigSchema.extend({
    type: z.literal('query-param'),
    default: z.unknown().optional(),
    fromQueryParam: z.any(),
    hidden: z.boolean().optional().default(true),
  }),

  // Custom render setting
  baseSettingConfigSchema.extend({
    type: z.literal('custom'),
    default: z.unknown(),
    render: z.any(),
    validate: z.any().optional(),
  }),
])

export type SettingConfig = z.infer<typeof settingConfigSchema>
export type SettingConfigType = SettingConfig['type']

// Value type map
type SettingConfigValueMap = {
  boolean: boolean
  number: number
  string: string
  'query-param': unknown
  custom: unknown
}

export type SettingConfigValue<K extends SettingConfigType> =
  K extends keyof SettingConfigValueMap ? SettingConfigValueMap[K] : never

// Helper to get value type from config
export type ValueFromConfig<T extends SettingConfig> = T extends {
  type: infer K
}
  ? K extends keyof SettingConfigValueMap
    ? SettingConfigValueMap[K]
    : never
  : never

// Legacy type aliases for backwards compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SettingsParam<T = any> = SettingConfig & {
  type: 'boolean' | 'number' | 'string' | 'query-param' | 'custom'
  value?: T
}

export interface Folder {
  type: 'folder'
  title: string
  hidden?: boolean
}

export interface Button {
  type: 'button'
  title: string
  onClick: () => void
}

export type Entry = Folder | Button | SettingsParam

// Default settings configuration
const DEFAULT_CONFIG_VALUE = {
  // state settings (not stored)
  hide_all: {
    type: 'query-param' as const,
    hidden: true,
    fromQueryParam: (value: string) => value === 'true',
    default: false,
  },
  show_control_panel: {
    type: 'query-param' as const,
    hidden: true,
    fromQueryParam: (value: string) => value === 'true',
    default: false,
  },
  show_qr: {
    type: 'query-param' as const,
    hidden: true,
    fromQueryParam: (value: string) => value === 'true',
    default: false,
  },

  editor: {
    type: 'folder' as const,
    title: 'Editor',
  },
  'editor.format_on_render': {
    type: 'boolean' as const,
    label: 'Format on render',
    default: false,
  },
  'editor.fullscreen': {
    type: 'boolean' as const,
    label: 'Fullscreen',
    default: false,
    validate: (value: boolean) => {
      if (value === false && isMobile()) {
        return "Can't set fullscreen off when width is too small"
      }
      return null
    },
  },
  'editor.vim': {
    type: 'boolean' as const,
    label: 'Vim',
    details: "Very experimental, don't expect all vim features",
    default: false,
  },
  'editor.relative_lines': {
    type: 'boolean' as const,
    label: 'Relative Lines',
    default: false,
  },
  'editor.folding': {
    type: 'boolean' as const,
    label: 'Code Folding',
    default: true,
  },
  'editor.show_history': {
    type: 'boolean' as const,
    label: 'Show file history in toolbar',
    default: true,
  },
  'editor.show_active_bookmark': {
    type: 'boolean' as const,
    label: 'Show active bookmark in the top bar of the editor',
    default: true,
  },
  'editor.history_buffer_size': {
    type: 'number' as const,
    label: 'History Buffer Size',
    min: 1,
    max: 50,
    default: 10,
    validate: (v: number) => {
      const d = z.number().min(1).max(50).safeParse(v)
      if (d.success === false) return z.prettifyError(d.error)
      return null
    },
  },
  'editor.init_render': {
    type: 'boolean' as const,
    label: 'Render code on start up',
    default: true,
  },

  controller: {
    type: 'folder' as const,
    title: 'Controller',
  },
  'controller.enabled': {
    type: 'boolean' as const,
    label: 'Enable controller',
    default: true,
  },
  'controller.qr_size': {
    type: 'number' as const,
    label: 'QR Size',
    default: 100,
  },

  actions: {
    type: 'folder' as const,
    title: 'Actions',
  },
  'actions.export_enabled': {
    type: 'boolean' as const,
    label: 'Enable svg export action',
    default: true,
  },
  'actions.export_optimize': {
    type: 'boolean' as const,
    label: 'Optimize svg export',
    default: true,
  },

  sandbox: {
    type: 'folder' as const,
    title: 'Sandbox',
  },
  'sandbox.resource_monitor': {
    type: 'boolean' as const,
    label: 'View resource usage in the top right of the sandbox',
    default: false,
  },

  params: {
    type: 'folder' as const,
    title: 'Parameters',
  },
  'params.auto_render': {
    type: 'boolean' as const,
    label: 'Auto render on parameter change',
    default: true,
  },
  'params.compact_layout': {
    type: 'boolean' as const,
    label: 'Compact layout',
    default: false,
  },
}

export const DEFAULT_SETTINGS_CONFIG = DEFAULT_CONFIG_VALUE as Record<
  ParamKey,
  Entry
>

type Generic<T> = {
  [K in keyof T]: K extends 'type' ? string : T[K]
}
type GenericSettingsConfig = Record<
  string,
  Generic<SettingsParam> | Generic<Folder> | Generic<Button>
>
type SettingsConfig<T extends GenericSettingsConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends { default: any }
    ? SettingsParam<T[K]['default']>
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T[K] extends { onClick: any }
      ? Button
      : Folder
}
export type DefaultSettingsConfig = SettingsConfig<typeof DEFAULT_CONFIG_VALUE>

type GenericParams<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends SettingsParam ? K : never
}[keyof T]
export type ParamKey = GenericParams<DefaultSettingsConfig>
export type ParamValue<P extends ParamKey> =
  (typeof DEFAULT_CONFIG_VALUE)[P]['default']

type GenericFolders<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Folder ? K : never
}[keyof T]
export type Folders = GenericFolders<DefaultSettingsConfig>

type GenericButtons<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Button ? K : never
}[keyof T]
export type Buttons = GenericButtons<DefaultSettingsConfig>
