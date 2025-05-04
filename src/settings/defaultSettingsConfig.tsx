import { SemVer } from 'semver'
import { MODE, CREAGEN_DEV_VERSION, CREAGEN_EDITOR_VERSION } from '../env'
import { generateHumanReadableName, roundToDec } from '../util'
import { SettingsConfig } from './Settings'
import { LinearProgressWithLabelSetting } from './LinearProgressWithLabelSetting'
import React from 'react'

export interface Library {
  name: string
  version: SemVer
}

export const defaultSettingsConfig = {
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
    opts: { readonly: true },
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
    type: 'param',
    label: 'Show all',
    value: false,
    generated: true,
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
    opts: {
      readonly: true,
    },
  },
  'debug.package': {
    type: 'param',
    label: 'Package',
    value: `creagen@${CREAGEN_DEV_VERSION}`,
    opts: {
      readonly: true,
    },
  },
  'debug.editor': {
    type: 'param',
    label: 'Editor Version',
    value: `${CREAGEN_EDITOR_VERSION}`,
    opts: {
      readonly: true,
    },
  },
}

export type DefaultAppSettingsConfig = SettingsConfig<
  typeof defaultSettingsConfig
>
