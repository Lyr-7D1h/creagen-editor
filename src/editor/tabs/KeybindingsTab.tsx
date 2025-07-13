import React from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'
import { COMMANDS } from '../../creagen-editor/commands'

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

export function KeybindingsTab() {
  const creagen = useCreagenEditor()
  const keybindings = creagen.keybindings.getKeybindings()

  return (
    <div style={{ padding: '16px', maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '16px', color: '#333' }}>
        Keyboard Shortcuts
      </h2>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: '#fff',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                borderBottom: '2px solid #e9ecef',
                fontWeight: '600',
                color: '#495057',
              }}
            >
              Shortcut
            </th>
            <th
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                borderBottom: '2px solid #e9ecef',
                fontWeight: '600',
                color: '#495057',
              }}
            >
              Description
            </th>
            <th
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                borderBottom: '2px solid #e9ecef',
                fontWeight: '600',
                color: '#495057',
              }}
            >
              Context
            </th>
          </tr>
        </thead>
        <tbody>
          {keybindings.map((bind, index) => (
            <tr
              key={`${bind.key}-${bind.command}`}
              style={{
                backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e3f2fd'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  index % 2 === 0 ? '#fff' : '#f8f9fa'
              }}
            >
              <td
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e9ecef',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                <code
                  style={{
                    backgroundColor: '#f1f3f4',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #dadce0',
                  }}
                >
                  {formatKey(bind.key)}
                </code>
              </td>
              <td
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e9ecef',
                  color: '#495057',
                }}
              >
                {COMMANDS[bind.command].description}
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
                    backgroundColor:
                      bind.when === 'editor' ? '#fff3cd' : '#d1ecf1',
                    color: bind.when === 'editor' ? '#856404' : '#0c5460',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  {bind.when || 'Global'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {keybindings.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6c757d',
            fontStyle: 'italic',
          }}
        >
          No keyboard shortcuts configured
        </div>
      )}
    </div>
  )
}
