import React, { useState } from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'
import ReplayIcon from '@mui/icons-material/Replay'
import { COMMANDS, Command } from '../../creagen-editor/commands'
import {
  ActiveKeybinding,
  Keybindings,
  KeyInfo,
} from '../../creagen-editor/keybindings'
import { KeyCaptureInput } from './KeyCaptureInput'
import { IconButton } from '@mui/material'

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

interface KeybindingRowProps {
  command: Command
  keybindings: Keybindings
  onUpdate: (command: Command, key: string, oldKey?: string) => void
  onReset: (command: Command) => void
}

function KeybindingRows({
  keybindings,
  command,
  onUpdate,
  onReset,
}: KeybindingRowProps) {
  const kb = keybindings.getKeybindingsToCommand(command)[0]
  const [editing, setEditing] = useState<boolean>(false)

  const handleUpdate = (key: KeyInfo) => {
    onUpdate(command, key, kb?.key)
    setEditing(false)
  }

  const renderKeybinding = (kb?: ActiveKeybinding) => {
    if (editing) {
      return (
        <KeyCaptureInput
          value={kb?.key ?? ''}
          onCapture={(key) => handleUpdate(key)}
          onCancel={() => setEditing(false)}
        />
      )
    }
    if (typeof kb === 'undefined')
      return (
        <i
          onClick={() => setEditing(true)}
          style={{ cursor: 'pointer', fontStyle: 'italic' }}
        >
          Unbound
        </i>
      )

    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={() => setEditing(true)}
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
        {kb.custom && (
          <IconButton
            sx={{
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
            onClick={(e) => {
              e.stopPropagation()
              onReset(command)
            }}
            size="small"
          >
            <ReplayIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </div>
    )
  }

  return (
    <>
      <tr
        style={{
          backgroundColor: kb?.custom ? '#f8f9fa' : '#fff',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#e3f2fd'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = kb?.custom
            ? '#f8f9fa'
            : '#fff'
        }}
      >
        <td
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e9ecef',
            color: '#495057',
          }}
        >
          {COMMANDS[command].description}
        </td>
        <td
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e9ecef',
          }}
        >
          {renderKeybinding(kb)}
        </td>
        <td
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e9ecef',
            color: '#6c757d',
            fontSize: '14px',
          }}
        >
          <span
            style={{
              backgroundColor: '#d1ecf1',
              color: '#0c5460',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {kb?.when ? kb.when.join(', ') : 'Global'}
          </span>
        </td>
      </tr>
    </>
  )
}

export function KeybindingsTab() {
  const creagen = useCreagenEditor()
  const [, setTick] = useState(0)
  const forceUpdate = () => setTick((t) => t + 1)

  const handleUpdateKeybinding = async (
    command: Command,
    key: KeyInfo,
    oldKey?: KeyInfo,
  ) => {
    console.log(oldKey, key)
    if (oldKey) await creagen.keybindings.removeKeybinding(oldKey, command)
    // only remove if empty
    if (key.length === 0) return

    await creagen.keybindings.addKeybinding(key, command)
    forceUpdate()
  }

  const handleResetKeybinding = async (command: Command) => {
    await creagen.keybindings.reset(command)
    forceUpdate()
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px', color: '#343a40' }}>
        Keybindings
      </h1>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: '12px 16px',
                borderBottom: '2px solid #dee2e6',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                fontWeight: '600',
              }}
            >
              Command
            </th>
            <th
              style={{
                padding: '12px 16px',
                borderBottom: '2px solid #dee2e6',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                fontWeight: '600',
              }}
            >
              Keybinding
            </th>
            <th
              style={{
                padding: '12px 16px',
                borderBottom: '2px solid #dee2e6',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                fontWeight: '600',
              }}
            >
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(COMMANDS).map((command) => (
            <KeybindingRows
              key={command}
              keybindings={creagen.keybindings}
              command={command as Command}
              onUpdate={handleUpdateKeybinding}
              onReset={handleResetKeybinding}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
