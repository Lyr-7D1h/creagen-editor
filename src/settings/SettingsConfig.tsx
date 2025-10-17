import React from 'react'
import { z } from 'zod'
import { semverSchema } from '../creagen-editor/schemaUtils'
import { isMobile } from '../creagen-editor/CreagenEditorView'

export const librarySchema = z.object({
  name: z.string(),
  version: semverSchema,
})
export type Library = z.infer<typeof librarySchema>

const defaultConfig = {
  // State parameters
  hide_all: {
    type: 'param',
    hidden: true,
    queryParam: (value: string) => {
      return value === 'true'
    },
    value: false,
  },
  general: {
    type: 'folder',
    title: 'General',
    hidden: true,
  },
  'general.libraries': {
    type: 'param',
    label: 'Libraries',
    hidden: true,
    generated: true,
    value: [] as Library[],
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
}

type Generic<T> = {
  [K in keyof T]: K extends 'type' ? string : T[K]
}
type GenericSettingsConfig = Record<
  string,
  Generic<SettingsParam> | Generic<Folder> | Generic<Button>
>
type SettingsConfig<T extends GenericSettingsConfig> = {
  [K in keyof T]: T[K] extends { value: any }
    ? SettingsParam<T[K]['value']>
    : T[K] extends { onClick: any }
      ? Button
      : Folder
}
export type DefaultSettingsConfig = SettingsConfig<typeof defaultConfig>

type GenericParams<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends SettingsParam ? K : never
}[keyof T]
export type ParamKey = GenericParams<DefaultSettingsConfig>
export type ParamValue<P extends ParamKey> = (typeof defaultConfig)[P]['value']

type GenericFolders<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Folder ? K : never
}[keyof T]
export type Folders = GenericFolders<DefaultSettingsConfig>

type GenericButtons<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Button ? K : never
}[keyof T]
export type Buttons = GenericButtons<DefaultSettingsConfig>

export const defaultSettingsConfig = defaultConfig as Record<ParamKey, Entry>

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

export interface SettingsParam<T = any> {
  type: 'param'
  value: T
  label?: string
  /** return null in case its valid, otherwise string explaining the error */
  validate?: (value: T) => null | string
  details?: string
  queryParam?: (value: string) => T
  hidden?: boolean
  render?: (value: T, set?: (value: T) => void) => React.ReactNode
  readonly?: boolean
}

export type Entry = (Folder | Button | SettingsParam) & {
  generated?: boolean
}
