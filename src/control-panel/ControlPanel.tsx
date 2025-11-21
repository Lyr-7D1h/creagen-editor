import React from 'react'
import { Box } from '@mui/material'
import { Rnd } from 'react-rnd'
import { ParamsView } from '../params/ParamsView'
import { useLocalStorage } from '../storage/useLocalStorage'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { useForceUpdateOnEditorEvent } from '../events/useEditorEvents'
import { TopBar } from './TopBar'

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
  onMaximizeToggle,
  isMaximized,
  floating = false,
}: {
  onClose?: () => void
  /** Disabled if floating=true */
  onMaximizeToggle?: () => void
  isMaximized?: boolean
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
          onMaximizeToggle={onMaximizeToggle}
          isMaximized={isMaximized}
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
