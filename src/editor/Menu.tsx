import React, { useEffect } from 'react'
import { Box, Button, ButtonGroup, CircularProgress } from '@mui/material'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import { AccountTree, Settings } from '@mui/icons-material'
import { VCSTab } from './tabs/VCSTab'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { SettingsTab } from './tabs/SettingsTab'
import { KeybindingsTab } from './tabs/KeybindingsTab'
import { useLocalStorage } from '../storage/useLocalStorage'

export type MenuProps = {
  width: string
}

const tabs = {
  vcs: {
    icon: <AccountTree />,
    title: 'Versions',
    content: <VCSTab />,
  },
  keybinds: {
    icon: <KeyboardIcon />,
    title: 'Keybindings',
    content: <KeybindingsTab />,
  },
  settings: {
    icon: <Settings />,
    title: 'Settings',
    content: <SettingsTab />,
  },
}
export type TabKey = keyof typeof tabs

const defaultKey = Object.keys(tabs)[0]! as TabKey

export function Menu({ width }: MenuProps) {
  const creagenEditor = useCreagenEditor()
  const [currentView, setCurrentView] = useLocalStorage(
    'menu-view-tab',
    defaultKey,
  )

  useEffect(() => {
    if (currentView) creagenEditor.storage.set('menu-view-tab', currentView)
  }, [currentView])

  if (currentView === null)
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress />
      </Box>
    )

  return (
    <Box
      sx={{ width, height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Box
        sx={{
          p: 1,
          backgroundColor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <ButtonGroup
          variant="outlined"
          size="small"
          fullWidth
          sx={{ '& .MuiButton-root': { flex: 1 } }}
        >
          {Object.entries(tabs).map(([key, tab]) => (
            <Button
              variant={currentView === key ? 'contained' : 'outlined'}
              onClick={() => setCurrentView(key as TabKey)}
              startIcon={tab.icon}
              sx={{
                textTransform: 'none',
                fontWeight: currentView === key ? 600 : 400,
              }}
            >
              {tab.title}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tabs[currentView as TabKey].content}
      </Box>
    </Box>
  )
}
