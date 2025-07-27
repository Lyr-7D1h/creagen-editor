import { MODE, CREAGEN_EDITOR_VERSION } from '../env'
import React from 'react'
import { z } from 'zod'
import { semverSchema } from '../creagen-editor/schemaUtils'

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
  },
  'editor.vim': {
    type: 'param',
    label: 'Vim',
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
  'editor.code_in_url': {
    type: 'param',
    label: 'Use code in the url',
    details:
      'Use code in the url instead of an id to generate shareable links without using remote storage',
    value: false,
  },

  export: {
    type: 'folder',
    title: 'Export',
  },
  'export.enabled': {
    type: 'param',
    label: 'Enabled',
    value: true,
  },
  'export.optimize': {
    type: 'param',
    label: 'Optimize',
    value: true,
  },

  debug: {
    type: 'folder',
    title: 'Debug',
    hidden: MODE !== 'dev',
  },
  'debug.mode': {
    type: 'param',
    label: 'Mode',
    value: `${MODE}`,
    readonly: true,
  },
  'debug.editor': {
    type: 'param',
    label: 'Editor Version',
    value: `${CREAGEN_EDITOR_VERSION}`,
    readonly: true,
  },
}

type Generic<T> = {
  [K in keyof T]: K extends 'type' ? string : T[K]
}
type GenericSettingsConfig = Record<
  string,
  Generic<Param> | Generic<Folder> | Generic<Button>
>
type SettingsConfig<T extends GenericSettingsConfig> = {
  [K in keyof T]: T[K] extends { value: any }
    ? Param<T[K]['value']>
    : T[K] extends { onClick: any }
      ? Button
      : Folder
}
export type DefaultSettingsConfig = SettingsConfig<typeof defaultConfig>

type GenericParams<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Param ? K : never
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

export interface Param<T = any> {
  type: 'param'
  value: T
  label?: string
  details?: string
  queryParam?: (value: string) => T
  hidden?: boolean
  render?: (value: T, set?: (value: T) => void) => React.ReactNode
  readonly?: boolean
}

export type Entry = (Folder | Button | Param) & {
  generated?: boolean
}
