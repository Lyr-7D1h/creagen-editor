import { KeyCode, KeyMod } from 'monaco-editor'
import { Command, COMMANDS } from './commands'
import { CreagenEditor } from './CreagenEditor'
import { Editor } from './editor/Editor'

type KeyInfo = string

interface Keybinding {
  key: KeyInfo
  command: Command
  /** Define context in which the keybind is active */
  when?: 'editor' | 'sandbox'
}

const defaultKeybindings: Keybinding[] = [
  {
    key: 'ctrl+shift+enter',
    command: 'editor.run',
  },
  {
    key: 'ctrl+shift+f',
    command: 'editor.toggleFullscreen',
  },
  {
    key: 'ctrl+f11',
    command: 'editor.toggleHideAll',
  },
]

type Handler = (...args: any[]) => void
export class Keybindings {
  private keybindings: Keybinding[] = []
  private handlers: Map<Command, Handler> = new Map()

  constructor() {
    this.keybindings = defaultKeybindings
  }

  setupKeybindings(editor: CreagenEditor) {
    if (editor.editor === null) return

    const commandGroups = {} as Record<Command, Keybinding[]>
    for (const keybind of this.keybindings) {
      const group = commandGroups[keybind.command]
      if (group) {
        group.push(keybind)
      } else {
        commandGroups[keybind.command] = [keybind]
      }
    }

    for (const group of Object.values(commandGroups)) {
      const command = group[0]?.command
      if (typeof command !== 'string') throw new Error('Invalid command type')
      const handler = () => COMMANDS[command](editor)
      this.handlers.set(command, handler)
      for (const keybind of group) {
        this.addKeybind(editor.editor, keybind, handler)
      }
    }
  }

  private addKeybind(
    editor: Editor,
    keybind: Keybinding,
    handler: (...args: any[]) => void,
    preventDefault: boolean = true,
  ) {
    const monacoKeybinding = getMonacoKeybinding(keybind.key)
    editor.addKeybind(monacoKeybinding, handler)
    // only in editor
    if (keybind.when === 'editor') {
      return
    }

    const keyInfo = monacoKeyToBrowserKey(monacoKeybinding)
    if (!keyInfo) return

    // Create browser-level handler
    const browserHandler = (e: KeyboardEvent) => {
      if (
        keyInfo.ctrlKey === e.ctrlKey &&
        keyInfo.altKey === e.altKey &&
        keyInfo.shiftKey === e.shiftKey &&
        keyInfo.metaKey === e.metaKey &&
        keyInfo.key.toLowerCase() === e.key.toLowerCase()
      ) {
        if (preventDefault) e.preventDefault()
        handler()
      }
    }
    document.addEventListener('keydown', browserHandler)
  }

  getKeybindingsToCommand(command: Command): Keybinding[] {
    return Array.from(this.keybindings.entries())
      .filter(([_, bind]) => bind.command === command)
      .map(([_, bind]) => bind)
  }

  getKeybindings() {
    return Array.from(this.keybindings.keys())
  }
}

type MonacoKeyCode = keyof typeof KeyCode
type MonacoKeyInfo = number
/** Translate keybind string to a monaco keycode */
export function getMonacoKeybinding(key: KeyInfo): MonacoKeyInfo {
  // Handle multi-key combinations like "ctrl+k 1"
  const parts = key.split(' ')
  if (parts.length > 1) {
    // For multi-key combinations (e.g., "ctrl+k 1"),
    // Monaco uses the chord function to combine them
    const firstPart = getMonacoKeybinding(parts[0]!)
    const secondPart = getMonacoKeybinding(parts[1]!)
    return KeyMod.chord(firstPart, secondPart)
  }

  // Standard single-key combination (e.g., "ctrl+shift+f")
  const keyParts = key.split('+')
  let keyCode = 0

  for (const part of keyParts) {
    if (part.length === 0) continue
    switch (part.toLowerCase()) {
      case 'ctrl':
      case 'control':
        keyCode |= KeyMod.CtrlCmd
        break
      case 'shift':
        keyCode |= KeyMod.Shift
        break
      case 'alt':
        keyCode |= KeyMod.Alt
        break
      case 'meta':
      case 'cmd':
      case 'command':
        keyCode |= KeyMod.WinCtrl
        break
      default:
        // For single character keys like "f", "1", etc.
        if (part.length === 1) {
          // For digits 0-9
          if (part >= '0' && part <= '9') {
            keyCode |= KeyCode[`Digit${part.toUpperCase()}` as MonacoKeyCode]
          }
          // For letters a-z
          else if (part >= 'a' && part <= 'z') {
            keyCode |= KeyCode[`Key${part.toUpperCase()}` as MonacoKeyCode]
          } else {
            // Try to look up by the key part directly
            const keyCodeValue = KeyCode[part.toUpperCase() as MonacoKeyCode]
            if (keyCodeValue !== undefined) {
              keyCode |= keyCodeValue
            } else {
              throw new Error(`Key ${part} not found in KeyCode`)
            }
          }
        } else {
          // For longer named keys like "enter", "space", "f1", etc.
          const upperPart = part[0]!.toUpperCase() + part.slice(1)
          const keyCodeValue = KeyCode[upperPart as keyof typeof KeyCode]
          if (keyCodeValue !== undefined) {
            keyCode |= keyCodeValue
          } else if (upperPart.startsWith('F') && upperPart.length > 1) {
            // Handle function keys (F1-F24)
            const fnKey = KeyCode[upperPart as keyof typeof KeyCode]
            if (fnKey !== undefined) {
              keyCode |= fnKey
            }
          }
        }
    }
  }

  return keyCode
}

interface BrowserKeyInfo {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  key: string
}
/**
 * Converts a Monaco keybinding code to browser KeyboardEvent parameters
 */
export function monacoKeyToBrowserKey(
  keybinding: number,
): BrowserKeyInfo | null {
  const KEY_CODE_MAP: Record<number, string> = {
    // Special keys
    0: 'Unknown',
    1: 'Backspace',
    2: 'Tab',
    3: 'Enter',
    4: 'Shift',
    5: 'Ctrl',
    6: 'Alt',
    7: 'PauseBreak',
    8: 'CapsLock',
    9: 'Escape',
    10: ' ', // Space
    11: 'PageUp',
    12: 'PageDown',
    13: 'End',
    14: 'Home',
    15: 'ArrowLeft',
    16: 'ArrowUp',
    17: 'ArrowRight',
    18: 'ArrowDown',
    19: 'Insert',
    20: 'Delete',

    // Digits
    21: '0',
    22: '1',
    23: '2',
    24: '3',
    25: '4',
    26: '5',
    27: '6',
    28: '7',
    29: '8',
    30: '9',

    // Letters
    31: 'a',
    32: 'b',
    33: 'c',
    34: 'd',
    35: 'e',
    36: 'f',
    37: 'g',
    38: 'h',
    39: 'i',
    40: 'j',
    41: 'k',
    42: 'l',
    43: 'm',
    44: 'n',
    45: 'o',
    46: 'p',
    47: 'q',
    48: 'r',
    49: 's',
    50: 't',
    51: 'u',
    52: 'v',
    53: 'w',
    54: 'x',
    55: 'y',
    56: 'z',

    // Meta/Windows key
    57: 'Meta',
    58: 'ContextMenu',

    // Function keys
    59: 'F1',
    60: 'F2',
    61: 'F3',
    62: 'F4',
    63: 'F5',
    64: 'F6',
    65: 'F7',
    66: 'F8',
    67: 'F9',
    68: 'F10',
    69: 'F11',
    70: 'F12',
    71: 'F13',
    72: 'F14',
    73: 'F15',
    74: 'F16',
    75: 'F17',
    76: 'F18',
    77: 'F19',
    78: 'F20',
    79: 'F21',
    80: 'F22',
    81: 'F23',
    82: 'F24',

    // More special keys
    83: 'NumLock',
    84: 'ScrollLock',

    // Punctuation and symbols
    85: ';', // Semicolon
    86: '=', // Equal
    87: ',', // Comma
    88: '-', // Minus
    89: '.', // Period
    90: '/', // Slash
    91: '`', // Backquote
    92: '[', // BracketLeft
    93: '\\', // Backslash
    94: ']', // BracketRight
    95: "'", // Quote
    96: 'OEM_8',
    97: 'IntlBackslash',

    // Numpad
    98: '0', // Numpad0
    99: '1', // Numpad1
    100: '2', // Numpad2
    101: '3', // Numpad3
    102: '4', // Numpad4
    103: '5', // Numpad5
    104: '6', // Numpad6
    105: '7', // Numpad7
    106: '8', // Numpad8
    107: '9', // Numpad9
    108: '*', // NumpadMultiply
    109: '+', // NumpadAdd
    110: ',', // NUMPAD_SEPARATOR
    111: '-', // NumpadSubtract
    112: '.', // NumpadDecimal
    113: '/', // NumpadDivide

    // Media keys
    117: 'AudioVolumeMute',
    118: 'AudioVolumeUp',
    119: 'AudioVolumeDown',

    // Browser keys
    120: 'BrowserSearch',
    121: 'BrowserHome',
    122: 'BrowserBack',
    123: 'BrowserForward',

    // Media control
    124: 'MediaTrackNext',
    125: 'MediaTrackPrevious',
    126: 'MediaStop',
    127: 'MediaPlayPause',

    // Launch keys
    128: 'LaunchMediaPlayer',
    129: 'LaunchMail',
    130: 'LaunchApp2',

    // Clear key
    131: 'Clear',
  }

  // Check if this is a chord keybinding (multi-key sequence)
  if ((keybinding & 0xffff0000) !== 0) {
    // Extract the two parts of the chord
    const firstPart = (keybinding >> 16) & 0xffff
    const secondPart = keybinding & 0xffff

    // Get the browser keys for both parts
    const firstKey = monacoKeyToBrowserKey(firstPart)
    const secondKey = monacoKeyToBrowserKey(secondPart)

    if (firstKey && secondKey) {
      // For chords, we typically return the second key with modifier info from both
      return {
        ctrlKey: firstKey.ctrlKey || secondKey.ctrlKey,
        altKey: firstKey.altKey || secondKey.altKey,
        shiftKey: firstKey.shiftKey || secondKey.shiftKey,
        metaKey: firstKey.metaKey || secondKey.metaKey,
        key: secondKey.key,
      }
    }

    return null
  }

  // Extract modifiers and keyCode
  const ctrlKey = !!(keybinding & KeyMod.CtrlCmd)
  const altKey = !!(keybinding & KeyMod.Alt)
  const shiftKey = !!(keybinding & KeyMod.Shift)
  const metaKey = !!(keybinding & KeyMod.WinCtrl) // Corrected to use KeyMod.WinCtrl

  // Get the key without modifiers
  const keyCode = keybinding & 0xff
  const key = KEY_CODE_MAP[keyCode]

  if (!key) {
    console.warn('Unsupported Monaco keybinding:', keybinding)
    return null
  }

  return { ctrlKey, altKey, shiftKey, metaKey, key }
}
