import React from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import { Rnd } from 'react-rnd'
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
      id={`contorl-panel-tabpanel-${index}`}
      aria-labelledby={`contorl-panel-tab-${index}`}
      style={{ height: '100%', overflow: 'hidden' }}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  )
}

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
}

function TopBar({
  tabs,
  validActiveTab,
  onTabChange,
  onClose,
  draggable,
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
      {onClose && <CloseButton onClose={onClose} />}
    </Box>
  )
}

function TabContent({ validActiveTab }: { validActiveTab: number }) {
  return (
    <Box sx={{ flex: 1, overflow: 'hidden' }}>
      <TabPanel value={validActiveTab} index={0}>
        <ParamsView />
      </TabPanel>
      <TabPanel value={validActiveTab} index={1}></TabPanel>
    </Box>
  )
}

export function ControlPanel({
  onClose,
  floating = false,
}: {
  onClose?: () => void
  floating?: boolean
}) {
  const creagenEditor = useCreagenEditor()
  // Force update when params change
  useForceUpdateOnEditorEvent('render')

  const [activeTab, setActiveTab] = useLocalStorage('contorl-panel-tab', 0)

  // Get parameter count
  const paramCount = creagenEditor.params.length

  // Tabs configuration - metadata can be dynamically updated
  const tabs = [
    {
      label: 'Parameters',
      index: 0,
      metadata: paramCount > 0 ? `(${paramCount})` : '',
      disabled: false,
    },
  ]

  // Ensure activeTab is a valid number (0 or 1)
  const validActiveTab = typeof activeTab === 'number' ? activeTab : 0

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  // Floating window state
  const [position, setPosition] = useLocalStorage('control-panel-position', {
    x: 100,
    y: 100,
  })
  const [size, setSize] = useLocalStorage('control-panel-size', {
    width: 400,
    height: 500,
  })

  if (!floating) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          pointerEvents: 'auto',
          backgroundColor: 'white',
        }}
      >
        <TopBar
          tabs={tabs}
          validActiveTab={validActiveTab}
          onTabChange={handleTabChange}
          onClose={onClose}
        />
        <TabContent validActiveTab={validActiveTab} />
      </Box>
    )
  }

  return (
    <Rnd
      position={{ x: position.x, y: position.y }}
      size={{ width: size.width, height: size.height }}
      minWidth={300}
      minHeight={200}
      bounds="window"
      dragHandleClassName="drag-handle"
      onDragStop={(_e, d) => setPosition({ x: d.x, y: d.y })}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        setSize({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
        })
        setPosition({ x: position.x, y: position.y })
      }}
      style={{
        position: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        pointerEvents: 'auto',
        backgroundColor: 'white',
        boxShadow:
          '0px 3px 5px -1px rgba(0,0,0,0.2), 0px 5px 8px 0px rgba(0,0,0,0.14), 0px 1px 14px 0px rgba(0,0,0,0.12)',
        borderRadius: '4px',
        border: '1px solid rgba(0, 0, 0, 0.12)',
        zIndex: 10,
      }}
    >
      <div className="drag-handle" style={{ cursor: 'grab' }}>
        <TopBar
          tabs={tabs}
          validActiveTab={validActiveTab}
          onTabChange={handleTabChange}
          onClose={onClose}
          draggable
        />
      </div>
      <TabContent validActiveTab={validActiveTab} />
    </Rnd>
  )
}
