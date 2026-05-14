import { z } from 'zod'
import { isMobile } from '../creagen-editor/isMobile'

export const SETTINGS_CONFIG = {
  // state settings (not stored)
  hide_all: {
    type: 'param-query' as const,
    // Used for parsing query search string to the value and defining that it is also stored in url query param
    fromQueryParam: (value: string) => {
      return value === 'true'
    },
    default: false as boolean,
  },
  show_control_panel: {
    type: 'param-query' as const,
    fromQueryParam: (value: string) => {
      return value === 'true'
    },
    default: false as boolean,
  },
  show_qr: {
    type: 'param-query' as const,
    fromQueryParam: (value: string) => {
      return value === 'true'
    },
    default: false as boolean,
  },

  'editor.format_on_render': {
    type: 'param' as const,
    label: 'Format on render',
    default: false as boolean,
  },
  'editor.fullscreen': {
    type: 'param' as const,
    label: 'Fullscreen',
    default: false as boolean,
    validate: (value: boolean) => {
      if (value === false && isMobile()) {
        return "Can't set fullscreen off when width is too small"
      }
      return null
    },
  },
  'editor.vim': {
    type: 'param' as const,
    label: 'Vim',
    details: "Very experimental, don't expect all vim features",
    default: false as boolean,
  },
  'editor.relative_lines': {
    type: 'param' as const,
    label: 'Relative Lines',
    default: false as boolean,
  },
  'editor.folding': {
    type: 'param' as const,
    label: 'Code Folding',
    default: true as boolean,
  },
  'editor.show_history': {
    type: 'param' as const,
    label: 'Show file history in toolbar',
    default: true as boolean,
  },
  'editor.show_active_bookmark': {
    type: 'param' as const,
    label: 'Show active bookmark in the top bar of the editor',
    default: true as boolean,
  },
  'editor.history_buffer_size': {
    type: 'param' as const,
    label: 'History Buffer Size',
    validate: (v: number) => {
      const d = z.number().min(1).max(50).safeParse(v)
      if (d.success === false) return z.prettifyError(d.error)
      return null
    },
    default: 10 as number,
  },
  'editor.init_render': {
    type: 'param' as const,
    label: 'Render code on start up',
    default: true as boolean,
  },

  'controller.enabled': {
    type: 'param' as const,
    label: 'Enable controller',
    default: true as boolean,
  },
  'controller.qr_size': {
    type: 'param' as const,
    label: 'QR Size',
    validate: (v) => {
      const d = z.number().min(1).max(1000).safeParse(v)
      if (!d.success) return z.prettifyError(d.error)
      return null
    },
    default: 100 as number,
  },

  'actions.export_enabled': {
    type: 'param' as const,
    label: 'Enable svg export action',
    default: true as boolean,
  },
  'actions.export_optimize': {
    type: 'param' as const,
    label: 'Optimize svg export',
    default: true as boolean,
  },

  'sandbox.resource_monitor': {
    type: 'param' as const,
    label: 'View resource usage in the top right of the sandbox',
    default: false as boolean,
  },

  'parameters.auto_render': {
    type: 'param' as const,
    label: 'Auto render on parameter change',
    default: true as boolean,
  },
  'parameters.compact_layout': {
    type: 'param' as const,
    label: 'Compact layout',
    default: false as boolean,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<string, SettingsEntry<any>>

export const FOLDERS = {
  editor: {
    title: 'Editor',
  },
  controller: {
    title: 'Controller',
  },
  actions: {
    title: 'Actions',
  },
  sandbox: {
    title: 'Sandbox',
  },
  parameters: {
    title: 'Parameters',
  },
}

export function isSettingsConfigKey(key: string): key is SettingsConfigKey {
  return key in SETTINGS_CONFIG
}
export type SettingsConfigKey = keyof typeof SETTINGS_CONFIG
export type SettingsEntryType<K extends SettingsConfigKey> =
  (typeof SETTINGS_CONFIG)[K]['default']

export type SettingsEntry<T = unknown> =
  | ParamSetting<T>
  | {
      type: 'param-query'
      default: T
      fromQueryParam: (value: string) => T
    }
export type ParamSetting<T = unknown> = {
  type: 'param'
  default: T
  label?: string
  /** return null in case its valid, otherwise string explaining the error */
  validate?: (value: T) => null | string
  details?: string
  readonly?: boolean
  render?: (value: T) => React.ReactNode
}
