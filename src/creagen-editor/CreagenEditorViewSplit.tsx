import {
  ExpandLess as ExpandLessIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import { useEffect } from 'react'
import { ControlPanel } from '../control-panel/ControlPanel'
import { EditorView } from '../editor/EditorView'
import {
  useForceUpdateOnEditorEvent,
  useSettings,
} from '../events/useEditorEvents'
import { Menu } from '../menu/Menu'
import { ParamsView } from '../params/ParamsView'
import { SandboxView } from '../sandbox/SandboxView'
import { useLocalStorage } from '../storage/useLocalStorage'
import { Actions } from './Actions'
import { useCreagenEditor } from './CreagenContext'
import { PerformanceMonitor } from './PerformanceMonitor'
import { QR } from './QR'

const MIN_WINDOW_SIZE = 200

/**
 * Split view with resizable panels using Allotment
 */
export function CreagenEditorViewSplit() {
  const creagenEditor = useCreagenEditor()

  // needed to check params on rerender
  useForceUpdateOnEditorEvent('render')
  let fullscreen = useSettings('editor.fullscreen')
  const hideAll = useSettings('hide_all')
  const resourceMonitorEnabled = useSettings('sandbox.resource_monitor')
  fullscreen = hideAll ? true : fullscreen

  const [menu, setMenu] = useLocalStorage('menu-view', false)
  const [controlOpen, setControlOpen] = useLocalStorage(
    'control-panel-open',
    true,
  )
  const [controlPanelMaximized, setControlPanelMaximized] = useLocalStorage(
    'control-panel-maximized',
    false,
  )

  // Layout the editor when the menu or fullscreen state changes
  useEffect(() => {
    creagenEditor.editor.layout()
  }, [menu, fullscreen, creagenEditor])

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Allotment>
        <Allotment.Pane
          snap
          visible={menu}
          minSize={MIN_WINDOW_SIZE}
          preferredSize="33%"
        >
          <Menu />
        </Allotment.Pane>

        <Allotment.Pane minSize={MIN_WINDOW_SIZE}>
          <Allotment>
            <Allotment.Pane
              minSize={MIN_WINDOW_SIZE}
              preferredSize="33%"
              visible={!fullscreen}
            >
              <Allotment
                vertical
                onChange={(sizes: number[]) => {
                  // if control panel is close to size 0 close it
                  const second = sizes[1]
                  if (!fullscreen && typeof second === 'number') {
                    if (second < 15 && controlOpen) {
                      setControlOpen(false)
                    }
                  }
                }}
              >
                {(!controlPanelMaximized || !controlOpen) && (
                  <Allotment.Pane minSize={MIN_WINDOW_SIZE} preferredSize="70%">
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                      }}
                    >
                      <EditorView
                        menu={menu}
                        toggleMenu={() => setMenu(!menu)}
                        active={!fullscreen}
                      />
                      {!controlOpen && !fullscreen && (
                        <Tooltip title="Open Control Panel" placement="left">
                          <IconButton
                            size="small"
                            onClick={() => setControlOpen(true)}
                            sx={{
                              position: 'absolute',
                              right: 15,
                              bottom: 10,
                              backgroundColor: 'background.paper',
                              boxShadow: 1,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                                boxShadow: 2,
                              },
                            }}
                          >
                            <ExpandLessIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                  </Allotment.Pane>
                )}
                <Allotment.Pane visible={controlOpen} snap>
                  <ControlPanel
                    onClose={() => setControlOpen(!controlOpen)}
                    isMaximized={controlPanelMaximized}
                    onMaximizeToggle={() =>
                      setControlPanelMaximized(!controlPanelMaximized)
                    }
                  />
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>
            <Allotment.Pane minSize={MIN_WINDOW_SIZE}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                }}
              >
                {/* NOTE: sandbox view should always be mounted to prevent disconnection with iframe */}
                <SandboxView />
                {resourceMonitorEnabled && <PerformanceMonitor />}
                <QR />

                {/* Show fullscreen editor overlay */}
                {fullscreen && !hideAll && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <EditorView
                        menu={menu}
                        toggleMenu={() => setMenu(!menu)}
                        active={fullscreen && !hideAll}
                      />
                      {!controlOpen && (
                        <Tooltip title="Open Control Panel" placement="left">
                          <IconButton
                            size="small"
                            onClick={() => setControlOpen(true)}
                            sx={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              backgroundColor: 'background.paper',
                              boxShadow: 1,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                                boxShadow: 2,
                              },
                            }}
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>

                    {controlOpen && (
                      <ControlPanel
                        floating={true}
                        onClose={() => setControlOpen(!controlOpen)}
                      />
                    )}
                  </div>
                )}
                {hideAll && controlOpen && (
                  <ControlPanel
                    floating={true}
                    onClose={() => setControlOpen(!controlOpen)}
                  />
                )}
              </div>
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
      </Allotment>
    </div>
  )
}

export function CreagenEditorViewContentMobile() {
  const creagenEditor = useCreagenEditor()
  useForceUpdateOnEditorEvent('params:config')
  const hideAll = useSettings('hide_all')
  const [menu, setMenu] = useLocalStorage('menu-view', false)
  useEffect(() => {
    creagenEditor.editor.setFullscreenMode(true)
    return () => {
      creagenEditor.editor.setFullscreenMode(false)
    }
  }, [creagenEditor])

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {/* NOTE: sandbox view should always be mounted to prevent disconnection with iframe */}
        <SandboxView width={hideAll ? '100svw' : undefined} />
        {!hideAll &&
          (menu ? (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <Menu width="100svw" />
              <Actions
                style={{ position: 'fixed', bottom: 10, right: 10 }}
                toggleMenu={() => setMenu(!menu)}
              />
            </div>
          ) : (
            <Actions
              style={{ position: 'fixed', bottom: 10, right: 10 }}
              toggleMenu={() => setMenu(!menu)}
            />
          ))}
      </div>

      {!hideAll && creagenEditor.params.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            padding: 12,
            boxShadow: '0 -6px 18px rgba(0,0,0,0.06)',
            minHeight: 110,
            maxHeight: '50vh',
            overflow: 'auto',
          }}
        >
          <ParamsView />
        </div>
      )}
    </div>
  )
}
