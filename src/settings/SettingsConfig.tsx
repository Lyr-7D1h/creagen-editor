import React from 'react'
import { z } from 'zod'
import { semverSchema } from '../creagen-editor/schemaUtils'
import { isMobile } from '../creagen-editor/isMobile'

export const librarySchema = z.object({
  name: z.string(),
  version: semverSchema,
})
export type Library = z.infer<typeof librarySchema>

const DEFAULT_CONFIG_VALUE = {
  // state settings (not stored)
  hide_all: {
    type: 'param',
    hidden: true,
    // Used for parsing query search string to the value and defining that it is also stored in url query param
    fromQueryParam: (value: string) => {
      return value === 'true'
    },
    value: false,
  },
  show_control_panel: {
    type: 'param',
    hidden: true,
    fromQueryParam: (value: string) => {
      return value === 'true'
    },
    value: false,
  },
  show_qr: {
    type: 'param',
    hidden: true,
    fromQueryParam: (value: string) => {
      return value === 'true'
    },
    value: false,
  },

  editor: {
    type: 'folder',
    title: 'Editor',
  },
  'editor.format_on_render': {
    type: 'param',
    label: 'Format on render',
    value: false,
  },
  'editor.fullscreen': {
    type: 'param',
    label: 'Fullscreen',
    value: false,
    validate: (value: boolean) => {
      if (value === false && isMobile()) {
        return "Can't set fullscreen off when width is too small"
      }
      return null
    },
  },
  'editor.vim': {
    type: 'param',
    label: 'Vim',
    details: "Very experimental, don't expect all vim features",
    value: false,
  },
  'editor.relative_lines': {
    type: 'param',
    label: 'Relative Lines',
    value: false,
  },
  'editor.folding': {
    type: 'param',
    label: 'Code Folding',
    value: true,
  },
  'editor.show_history': {
    type: 'param',
    label: 'Show file history',
    value: true,
  },
  'editor.show_active_bookmark': {
    type: 'param',
    label: 'Show active bookmark in the top bar of the editor',
    value: true,
  },
  'editor.history_buffer_size': {
    type: 'param',
    label: 'History Buffer Size',
    validate: (v: number) => {
      const d = z.number().min(1).max(50).safeParse(v)
      if (d.success === false) return z.prettifyError(d.error)
      return null
    },
    value: 10,
  },
  'editor.code_in_url': {
    type: 'param',
    label: 'Use code in the url',
    details:
      'Use code in the url instead of an id to generate shareable links without using remote storage',
    value: false,
  },
  'editor.init_render': {
    type: 'param',
    label: 'Render code on start up',
    value: true,
  },

  controller: {
    type: 'folder',
    title: 'Controller',
  },
  'controller.enabled': {
    type: 'param',
    label: 'Enable controller',
    value: true,
  },
  'controller.qr_size': {
    type: 'param',
    label: 'QR Size',
    value: 100,
  },

  actions: {
    type: 'folder',
    title: 'Actions',
  },
  'actions.enabled': {
    type: 'param',
    label: 'Enable action buttons',
    value: true,
  },
  'actions.export_enabled': {
    type: 'param',
    label: 'Enable svg export action',
    value: true,
  },
  'actions.export_optimize': {
    type: 'param',
    label: 'Optimize svg export',
    value: true,
  },

  sandbox: {
    type: 'folder',
    title: 'Sandbox',
  },
  'sandbox.resource_monitor': {
    type: 'param',
    label: 'View resource usage in the top right of the sandbox',
    value: false,
  },

  params: {
    type: 'folder',
    title: 'Parameters',
  },
  'params.auto_render': {
    type: 'param',
    label: 'Auto render on parameter change',
    value: true,
  },
  'params.compact_layout': {
    type: 'param',
    label: 'Compact layout',
    value: false,
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
  [K in keyof T]: T[K] extends { value: any }
    ? SettingsParam<T[K]['value']>
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
  (typeof DEFAULT_CONFIG_VALUE)[P]['value']

type GenericFolders<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Folder ? K : never
}[keyof T]
export type Folders = GenericFolders<DefaultSettingsConfig>

type GenericButtons<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Button ? K : never
}[keyof T]
export type Buttons = GenericButtons<DefaultSettingsConfig>

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SettingsParam<T = any> {
  type: 'param'
  value: T
  label?: string
  /** return null in case its valid, otherwise string explaining the error */
  validate?: (value: T) => null | string
  details?: string
  fromQueryParam?: (value: string) => T
  hidden?: boolean
  render?: (value: T, set?: (value: T) => void) => React.ReactNode
  readonly?: boolean
}

export type Entry = Folder | Button | SettingsParam
