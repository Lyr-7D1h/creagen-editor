import React, { useEffect, useState } from 'react'
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
import { LinearProgressWithLabelSetting } from '../settings/LinearProgressWithLabelSetting'
import { roundToDec } from '../util'
import { logger } from '../logs/logger'
export type MenuProps = {
  width: number
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

type Storage = {
  current: number
  max: number
}
const MENU_WIDTH_SMALL = 490
export function Menu({ width }: MenuProps) {
  const creagenEditor = useCreagenEditor()
  const [storage, setStorage] = useState<Storage | null>(null)
  const [currentView, setCurrentView] = useLocalStorage(
    'menu-view-tab',
    defaultKey,
  )

  useEffect(() => {
    if (currentView) creagenEditor.storage.set('menu-view-tab', currentView)
  }, [currentView])

  useEffect(() => {
    navigator.storage
      .estimate()
      .then((storage) =>
        setStorage({
          current: storage.usage ?? 0,
          max: storage.quota ?? 1,
        }),
      )
      .catch(logger.error)
  }, [])

  if (currentView === null)
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress />
      </Box>
    )

  return (
    <Box
      sx={{
        width: width + 'px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          p: 1,
          backgroundColor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <LinearProgressWithLabelSetting
          minLabel="0GB"
          maxLabel={`${storage ? roundToDec(storage.max / 1000000000, 3) : 0}GB`}
          variant="determinate"
          value={roundToDec(storage ? storage.current / storage.max : 0, 3)}
        />
        <ButtonGroup
          variant="outlined"
          size="small"
          fullWidth
          sx={{
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
                minWidth: width < MENU_WIDTH_SMALL ? 'auto' : undefined, // Show only icons on narrow screens
                px: width < MENU_WIDTH_SMALL ? 1 : undefined,
              }}
            >
              {width >= MENU_WIDTH_SMALL && tab.title}
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
