import {
  FullscreenExit as FullscreenExitIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material'
import { Box, Tabs, Tab, Tooltip, IconButton } from '@mui/material'
import React from 'react'
import { CloseButton } from './CloseButton'

interface TopBarProps {
  tabs: Array<{
    label: string
    index: number
    metadata: string
    disabled: boolean
  }>
  validActiveTab: number
  onTabChange: (_event: React.SyntheticEvent, newValue: number) => void
  onClose?: () => void
  draggable?: boolean
  onMaximizeToggle?: () => void
  isMaximized?: boolean
}

export function TopBar({
  tabs,
  validActiveTab,
  onTabChange,
  onClose,
  draggable,
  onMaximizeToggle,
  isMaximized,
}: TopBarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 32,
        flexShrink: 0,
        position: 'relative',
        pointerEvents: 'auto',
        gap: 0.5,
        ...(draggable === true && {
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing',
          },
        }),
      }}
    >
      <Tabs
        value={validActiveTab}
        onChange={onTabChange}
        aria-label="control panel tabs"
        sx={{
          flex: 1,
          minHeight: 32,
          pointerEvents: 'auto',
          '& .MuiTabs-indicator': {
            display: 'none',
          },
          '& .MuiTabs-flexContainer': {
            gap: 0,
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.index}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{tab.label}</span>
                {tab.metadata && (
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.65rem',
                      opacity: 0.7,
                      fontWeight: 400,
                    }}
                  >
                    {tab.metadata}
                  </Box>
                )}
              </Box>
            }
            value={tab.index}
            disabled={tab.disabled}
            sx={{
              minHeight: 28,
              minWidth: 'auto',
              px: 1.5,
              py: 0.5,
              fontSize: '0.75rem',
              textTransform: 'none',
              color: 'text.secondary',
              backgroundColor:
                validActiveTab === tab.index ? 'primary.main' : 'transparent',
              '&:hover': {
                backgroundColor:
                  validActiveTab === tab.index
                    ? 'primary.dark'
                    : 'action.hover',
              },
              '&.Mui-selected': {
                color:
                  validActiveTab === tab.index
                    ? 'primary.contrastText'
                    : 'text.primary',
              },
            }}
          />
        ))}
      </Tabs>
      {onMaximizeToggle && (
        <Tooltip title={(isMaximized ?? false) ? 'Restore' : 'Maximize'}>
          <IconButton
            onClick={onMaximizeToggle}
            size="small"
            sx={{
              p: 0.5,
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            {isMaximized === true ? (
              <FullscreenExitIcon fontSize="small" />
            ) : (
              <FullscreenIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
      {onClose && <CloseButton onClose={onClose} />}
    </Box>
  )
}
