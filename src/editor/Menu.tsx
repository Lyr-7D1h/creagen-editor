import React, { RefAttributes, useEffect } from 'react'
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Typography,
} from '@mui/material'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import { AccountTree, Settings } from '@mui/icons-material'
import { VCSTab } from './tabs/VCSTab'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { SettingsTab } from './tabs/SettingsTab'
import { KeybindingsTab } from './tabs/KeybindingsTab'
import { useLocalStorage } from '../storage/useLocalStorage'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import { DependenciesTab } from './tabs/DependenciesTab'
import { StorageBar } from './StorageBar'
import { MenuLinks } from '../shared/IconLinks'
export type MenuProps = {
  width?: string
}

const tabs = {
  vcs: {
    icon: <AccountTree />,
    title: 'Bookmarks',
    content: <VCSTab />,
  },
  dependencies: {
    icon: <AutoStoriesIcon />,
    title: 'Dependencies',
    content: <DependenciesTab />,
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

export function Menu<T>({ ref, width }: MenuProps & RefAttributes<T>) {
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
      ref={ref}
      sx={{
        width: width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'scroll',
      }}
    >
      <Box
        sx={{
          padding: 1,
          paddingTop: 0,
          backgroundColor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Creagen Editor</Typography>
            <Typography variant="caption" color="text.secondary">
              {CREAGEN_EDITOR_VERSION}{' '}
              {CREAGEN_EDITOR_COMMIT_HASH &&
                `(${CREAGEN_EDITOR_COMMIT_HASH.substring(0, 7)})`}
            </Typography>
          </Box>
          <MenuLinks />
        </Box>
        <StorageBar />
        <ButtonGroup
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            marginTop: '5px',
            '& .MuiButton-root': { flex: 1 },
          }}
        >
          {Object.entries(tabs).map(([key, tab]) => (
            <Button
              variant={currentView === key ? 'contained' : 'outlined'}
              onClick={() => setCurrentView(key as TabKey)}
              startIcon={tab.icon}
              sx={{
                textTransform: 'none',
                fontWeight: currentView === key ? 600 : 400,
                // minWidth: width < MENU_WIDTH_SMALL ? 'auto' : undefined, // Show only icons on narrow screens
                // px: width < MENU_WIDTH_SMALL ? 1 : undefined,
              }}
            >
              {/* {width >= MENU_WIDTH_SMALL && tab.title} */}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }} p={2}>
        <Typography variant="h5" gutterBottom textAlign={'center'}>
          {tabs[currentView as TabKey].title}
        </Typography>
        {tabs[currentView as TabKey].content}
      </Box>
    </Box>
  )
}
