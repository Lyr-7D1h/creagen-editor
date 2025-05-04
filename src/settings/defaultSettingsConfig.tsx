import { SemVer } from 'semver'
import { MODE, CREAGEN_DEV_VERSION, CREAGEN_EDITOR_VERSION } from '../env'
import { generateHumanReadableName, roundToDec } from '../util'
import { Button, Folder, Param, StateValue } from './Settings'
import { LinearProgressWithLabelSetting } from './LinearProgressWithLabelSetting'
import React from 'react'

export interface Library {
  name: string
  version: SemVer
}

const defaultConfig = {
  general: {
    type: 'folder',
    title: 'General',
  },
  'general.name': {
    type: 'param',
    label: 'Name',
    value: generateHumanReadableName(),
  },
  'general.libraries': {
    type: 'param',
    label: 'Libraries',
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
  'editor.hide_all': {
    type: 'state',
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
  debug: {
    type: 'folder',
    title: 'Debug',
  },
  'debug.mode': {
    type: 'param',
    label: 'Mode',
    value: `${MODE}`,

    readonly: true,
  },
  'debug.package': {
    type: 'param',
    label: 'Package',
    value: `creagen@${CREAGEN_DEV_VERSION}`,
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
  Generic<Param> | Generic<Folder> | Generic<Button> | Generic<StateValue>
>
type SettingsConfig<T extends GenericSettingsConfig> = {
  [K in keyof T]: T[K] extends { value: any }
    ? Param
    : T[K] extends { label: string }
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

export const defaultSettingsConfig = defaultConfig
