interface Keybind {
  key: string
  command: string
  when?: string
}

export const KEYBINDINGS: Keybind[] = [
  {
    key: 'ctrl+shift+enter',
    command: 'editor.run',
  },
]
