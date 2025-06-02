import { SemVer } from 'semver'
import { MODE, CREAGEN_EDITOR_VERSION } from '../env'
import { generateHumanReadableName, roundToDec } from '../util'
import { LinearProgressWithLabelSetting } from './LinearProgressWithLabelSetting'
import React from 'react'
import { LibrarySetting } from './LibrarySetting'

export interface Library {
  name: string
  version: SemVer
}

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
  },
  'general.project_name': {
    type: 'param',
    label: 'Name',
    value: generateHumanReadableName(),
  },
  'general.libraries': {
    type: 'param',
    label: 'Libraries',
    render: () => <LibrarySetting />,
    generated: true,
    value: [] as Library[],
  },
  'general.storage': {
    type: 'param',
    label: 'Available Storage',
    render: ({ current, max }: { current: number; max: number }) => (
      <LinearProgressWithLabelSetting
        minLabel="0GB"
        maxLabel={`${roundToDec(max / 1000000000, 3)}GB`}
        variant="determinate"
        value={roundToDec(current / max, 3)}
      />
    ),
    value: { value: 0, max: 0 },
    generated: true,
    readonly: true,
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
    ? Param
    : T[K] extends { onClick: any }
      ? Button
      : Folder
}
export type DefaultSettingsConfig = SettingsConfig<typeof defaultConfig>

type GenericParams<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Param ? K : never
}[keyof T]
export type Params = GenericParams<DefaultSettingsConfig>

type GenericFolders<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Folder ? K : never
}[keyof T]
export type Folders = GenericFolders<DefaultSettingsConfig>

type GenericButtons<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Button ? K : never
}[keyof T]
export type Buttons = GenericButtons<DefaultSettingsConfig>

export const defaultSettingsConfig = defaultConfig as Record<Params, Entry>

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
  queryParam?: (value: string) => T
  hidden?: boolean
  render?: (value: T, set?: (value: T) => void) => React.ReactNode
  readonly?: boolean
}

export type Entry = (Folder | Button | Param) & {
  generated?: boolean
}
