import React, { useState, useEffect } from 'react'
import { Box, Button, ButtonGroup, CircularProgress } from '@mui/material'
import {
  Settings as SettingsIcon,
  AccountTree as VcsIcon,
} from '@mui/icons-material'
import { VCSTab } from './tabs/VCSTab'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { logger } from '../logs/logger'
import { SettingsTab } from './tabs/SettingsTab'

export type ViewType = 'vcs' | 'settings'

export type MenuProps = {
  width: string
}

export function Menu({ width }: MenuProps) {
  const creagenEditor = useCreagenEditor()
  const [currentView, setCurrentView] = useState<ViewType | null>(null)

  useEffect(() => {
    creagenEditor.storage
      .get('menu-current-view')
      .then((v) => {
        if (v) {
          setCurrentView(v)
        } else {
          setCurrentView('vcs')
        }
      })
      .catch((e) => {
        logger.error(e)
        setCurrentView('vcs')
      })
  }, [])

  useEffect(() => {
    if (currentView) creagenEditor.storage.set('menu-current-view', currentView)
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
          <Button
            variant={currentView === 'vcs' ? 'contained' : 'outlined'}
            onClick={() => setCurrentView('vcs')}
            startIcon={<VcsIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: currentView === 'vcs' ? 600 : 400,
            }}
          >
            VCS
          </Button>
          <Button
            variant={currentView === 'settings' ? 'contained' : 'outlined'}
            onClick={() => setCurrentView('settings')}
            startIcon={<SettingsIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: currentView === 'settings' ? 600 : 400,
            }}
          >
            Settings
          </Button>
        </ButtonGroup>
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {currentView === 'vcs' ? <VCSTab /> : <SettingsTab />}
      </Box>
    </Box>
  )
}
