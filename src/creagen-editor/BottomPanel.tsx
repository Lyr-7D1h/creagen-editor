import React from 'react'
import { Box, Tab, Tabs, Stack } from '@mui/material'
import { ParamsView } from '../params/ParamsView'
import { useLocalStorage } from '../storage/useLocalStorage'
import { useCreagenEditor } from './CreagenEditorView'
import { CloseButton } from './CloseButton'
import { useForceUpdateOnEditorEvent } from '../events/useEditorEvents'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bottom-panel-tabpanel-${index}`}
      aria-labelledby={`bottom-panel-tab-${index}`}
      style={{ height: '100%', overflow: 'hidden' }}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  )
}

export function BottomPanel({ onClose }: { onClose?: () => void }) {
  const creagenEditor = useCreagenEditor()
  // Force update when params change
  useForceUpdateOnEditorEvent('render')

  const [activeTab, setActiveTab] = useLocalStorage('bottom-panel-tab', 0)

  // Get parameter count
  const paramCount = creagenEditor.params.length

  // Tabs configuration - metadata can be dynamically updated
  const tabs = [
    {
      label: 'Parameters',
      index: 0,
      metadata: paramCount > 0 ? `(${paramCount})` : '',
    },
    { label: 'Info', index: 1, metadata: '' },
  ]

  // Ensure activeTab is a valid number (0 or 1)
  const validActiveTab = typeof activeTab === 'number' ? activeTab : 0

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        pointerEvents: 'auto',
        marginTop: '5px',
      }}
    >
      {/* Close button placed inside panel so parent can just pass onClose */}
      {onClose && (
        <div style={{ position: 'absolute', right: 6, top: 6, zIndex: 20 }}>
          <CloseButton onClose={onClose} />
        </div>
      )}

      {/* Tab Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 32,
          flexShrink: 0,
          px: 0.5,
          position: 'relative',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        <Tabs
          value={validActiveTab}
          onChange={handleTabChange}
          aria-label="bottom panel tabs"
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
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={validActiveTab} index={0}>
          <ParamsView />
        </TabPanel>
        <TabPanel value={validActiveTab} index={1}>
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Box>
                <strong>Info Panel</strong>
              </Box>
              <Box sx={{ color: 'text.secondary' }}>
                Additional information and details can be displayed here.
              </Box>
            </Stack>
          </Box>
        </TabPanel>
      </Box>
    </Box>
  )
}
