import React, { useState } from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import ReplayIcon from '@mui/icons-material/Replay'
import DeleteIcon from '@mui/icons-material/Delete'
import { COMMANDS, Command } from '../../creagen-editor/commands'
import {
  ActiveKeybinding,
  KeyInfo,
  getDefaultKeybindingsForCommand,
} from '../../creagen-editor/keybindings'
import { KeyCaptureInput } from './KeyCaptureInput'
import { Chip, IconButton } from '@mui/material'
import { ColumnDef, Table } from '../../shared/Table'
import { logger } from '../../logs/logger'

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
  keybindings: ActiveKeybinding[]
}

export function KeybindingsTab() {
  const creagen = useCreagenEditor()
  const [, setTick] = useState(0)
  // Editing a specific binding: { command, oldKey } where oldKey undefined means "adding new"
  const [editingCommand, setEditingCommand] = useState<{
    command: Command
    oldKey?: string
  } | null>(null)
  const forceUpdate = () => setTick((t) => t + 1)

  const handleUpdateKeybinding = async (
    command: Command,
    key: KeyInfo,
    oldKey?: KeyInfo,
  ) => {
    if (oldKey != null)
      await creagen.keybindings.removeKeybinding(oldKey, command)
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

  const handleRemoveSingle = async (key: string, command: Command) => {
    await creagen.keybindings.removeKeybinding(key, command)
    forceUpdate()
  }

  const keybindingData: KeybindingRow[] = Object.keys(COMMANDS).map(
    (command) => ({
      command: command as Command,
      keybindings: creagen.keybindings.getKeybindingsToCommand(
        command as Command,
      ),
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
      cell: ({ command, keybindings }) => {
        // If editing this command (either adding new or editing existing), show capture input
        if (editingCommand?.command === command) {
          const oldKey = editingCommand.oldKey
          return (
            <KeyCaptureInput
              value={oldKey ?? ''}
              onCapture={(key) => {
                handleUpdateKeybinding(command, key, oldKey).catch(logger.error)
              }}
              onCancel={() => setEditingCommand(null)}
            />
          )
        }

        // Determine whether current bindings differ from the defaults
        const defaultKeys = getDefaultKeybindingsForCommand(command)
        const currentKeys = keybindings.map((kb) => kb.key)
        const sortAndString = (arr: string[]) => arr.slice().sort().join('|')
        const hasChanged =
          sortAndString(defaultKeys) !== sortAndString(currentKeys)

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
            // clicking the container starts adding a new binding
            onClick={() => setEditingCommand({ command })}
          >
            {keybindings.length > 0 ? (
              keybindings.map((kb) => (
                <div
                  key={kb.key}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingCommand({ command, oldKey: kb.key })
                  }}
                >
                  <code
                    style={{
                      backgroundColor: '#f1f3f4',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #dadce0',
                      cursor: 'pointer',
                    }}
                  >
                    {formatKey(kb.key)}
                  </code>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveSingle(kb.key, command).catch(logger.error)
                    }}
                    size="small"
                    title="Remove binding"
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </div>
              ))
            ) : (
              <b style={{ cursor: 'pointer' }}>Unbound</b>
            )}

            {/* Add new binding button */}
            <code
              onClick={(e) => {
                e.stopPropagation()
                setEditingCommand({ command })
              }}
              style={{
                backgroundColor: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px dashed #cfd8dc',
                cursor: 'pointer',
              }}
            >
              +
            </code>

            {/* Reset all bindings for this command to defaults when changed */}
            {hasChanged && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  handleResetKeybinding(command).catch(logger.error)
                }}
                size="small"
                title="Reset to default bindings"
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
      cell: ({ keybindings }) => {
        const whens = keybindings.flatMap((kb) => kb.when ?? [])
        const uniq = Array.from(new Set(whens))
        const label = uniq.length > 0 ? uniq.join(', ') : 'Global'
        return (
          <Chip
            color={uniq.length === 0 ? 'default' : 'info'}
            size="small"
            label={label}
          />
        )
      },
    },
  ]

  return (
    <Table
      columns={columns}
      data={keybindingData}
      getRowKey={({ command }) => command}
      getRowSx={({ keybindings }) => ({
        backgroundColor: keybindings.some((kb) => kb.custom)
          ? '#f8f9fa'
          : 'transparent',
      })}
    />
  )
}
