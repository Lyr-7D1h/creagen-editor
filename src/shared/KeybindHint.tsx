import { Fragment, type ReactNode } from 'react'

interface KeybindHintProps {
  keybind: string
  label?: ReactNode
  wrapInParens?: boolean
  emptyLabel?: ReactNode
  className?: string
}

function formatKeyPart(part: string): string {
  const lower = part.toLowerCase()

  switch (lower) {
    case 'ctrl':
    case 'control':
      return 'Ctrl'
    case 'shift':
      return 'Shift'
    case 'alt':
      return 'Alt'
    case 'meta':
    case 'cmd':
    case 'command':
      return 'Cmd'
    default:
      if (part.length === 1) return part.toUpperCase()
      return part[0]!.toUpperCase() + part.slice(1)
  }
}

function parseKeybind(keybind: string): string[][] {
  return keybind
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((chord) =>
      chord
        .split(/\s*\+\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map(formatKeyPart),
    )
    .filter((chord) => chord.length > 0)
}

/** Monaco styled keybind */
export function KeybindHint({
  keybind,
  label,
  wrapInParens = false,
  emptyLabel,
  className,
}: KeybindHintProps) {
  const chords = parseKeybind(keybind)
  const hasKeybind = chords.length > 0

  if (!hasKeybind) {
    return <span className={className}>{emptyLabel ?? label ?? ''}</span>
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      {label != null ? <span>{label}</span> : null}
      {wrapInParens ? <span>(</span> : null}
      <span className="monaco-keybinding">
        {chords.map((chord, chordIndex) => (
          <Fragment key={`chord-${chordIndex}`}>
            {chord.map((part, partIndex) => (
              <Fragment key={`${part}-${partIndex}`}>
                <span className="monaco-keybinding-key">{part}</span>
                {partIndex < chord.length - 1 ? (
                  <span className="monaco-keybinding-key-separator">+</span>
                ) : null}
              </Fragment>
            ))}
            {chordIndex < chords.length - 1 ? (
              <span className="monaco-keybinding-key-chord-separator" />
            ) : null}
          </Fragment>
        ))}
      </span>
      {wrapInParens ? <span>)</span> : null}
    </span>
  )
}
