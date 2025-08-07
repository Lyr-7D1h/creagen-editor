import React, { useState } from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'
import ReplayIcon from '@mui/icons-material/Replay'
import { COMMANDS, Command } from '../../creagen-editor/commands'
import { ActiveKeybinding, KeyInfo } from '../../creagen-editor/keybindings'
import { KeyCaptureInput } from './KeyCaptureInput'
import { Chip, IconButton } from '@mui/material'
import { ColumnDef, Table } from '../../shared/Table'

const formatKey = (key: string): string => {
  return key
    .split('+')
    .map((part) => {
      switch (part.toLowerCase()) {
        case 'ctrl':
          return 'Ctrl'
        case 'shift':
          return 'Shift'
        case 'alt':
          return 'Alt'
        case 'meta':
        case 'cmd':
          return 'Cmd'
        default:
          return part.toUpperCase()
      }
    })
    .join(' + ')
}

interface KeybindingRow {
  command: Command
  keybinding?: ActiveKeybinding
}

export function KeybindingsTab() {
  const creagen = useCreagenEditor()
  const [, setTick] = useState(0)
  const [editingCommand, setEditingCommand] = useState<Command | null>(null)
  const forceUpdate = () => setTick((t) => t + 1)

  const handleUpdateKeybinding = async (
    command: Command,
    key: KeyInfo,
    oldKey?: KeyInfo,
  ) => {
    if (oldKey) await creagen.keybindings.removeKeybinding(oldKey, command)
    if (key.length > 0) {
      await creagen.keybindings.addKeybinding(key, command)
    }
    setEditingCommand(null)
    forceUpdate()
  }

  const handleResetKeybinding = async (command: Command) => {
    await creagen.keybindings.reset(command)
    forceUpdate()
  }

  const keybindingData: KeybindingRow[] = Object.keys(COMMANDS).map(
    (command) => ({
      command: command as Command,
      keybinding: creagen.keybindings.getKeybindingsToCommand(
        command as Command,
      )[0],
    }),
  )

  const columns: ColumnDef<KeybindingRow>[] = [
    {
      header: 'Command',
      cell: ({ command }) => COMMANDS[command].description,
    },
    {
      header: 'Keybinding',
      width: 200,
      cell: ({ command, keybinding }) => {
        if (editingCommand === command) {
          return (
            <KeyCaptureInput
              value={keybinding?.key ?? ''}
              onCapture={(key) =>
                handleUpdateKeybinding(command, key, keybinding?.key)
              }
              onCancel={() => setEditingCommand(null)}
            />
          )
        }
        return (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setEditingCommand(command)}
          >
            {keybinding ? (
              <code
                style={{
                  backgroundColor: '#f1f3f4',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #dadce0',
                  cursor: 'pointer',
                }}
              >
                {formatKey(keybinding.key)}
              </code>
            ) : (
              <i style={{ cursor: 'pointer' }}>Unbound</i>
            )}
            {keybinding?.custom && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  handleResetKeybinding(command)
                }}
                size="small"
              >
                <ReplayIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </div>
        )
      },
    },
    {
      header: 'When',
      width: 120,
      cell: ({ keybinding }) => (
        <Chip
          color={typeof keybinding?.when === 'undefined' ? 'default' : 'info'}
          size="small"
          label={keybinding?.when ? keybinding.when.join(', ') : 'Global'}
        />
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      data={keybindingData}
      getRowKey={({ command }) => command}
      getRowSx={({ keybinding }) => ({
        backgroundColor: keybinding?.custom ? '#f8f9fa' : 'transparent',
      })}
    />
  )
}
