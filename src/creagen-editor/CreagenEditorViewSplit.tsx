import React, { useEffect } from 'react'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import { EditorView } from '../editor/EditorView'
import { SandboxView } from '../sandbox/SandboxView'
import { Menu } from '../editor/Menu'
import {
  useForceUpdateOnEditorEvent,
  useSettings,
} from '../events/useEditorEvents'
import { useLocalStorage } from '../storage/useLocalStorage'
import { Actions } from './Actions'
import { useCreagenEditor } from './CreagenContext'
import { PerformanceMonitor } from '../sandbox/PerformanceMonitor'
import { ControlPanel } from './ControlPanel'
import { ParamsView } from '../params/ParamsView'

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
    false,
  )

  // Layout the editor when the menu or fullscreen state changes
  useEffect(() => {
    creagenEditor.editor.layout()
  }, [menu, fullscreen, creagenEditor])

  if (hideAll) {
    return (
      <>
        <SandboxView />
        {controlOpen && (
          <ControlPanel
            floating={true}
            onClose={() => setControlOpen(!controlOpen)}
          />
        )}
      </>
    )
  }

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
          {fullscreen ? (
            <div
              style={{ position: 'relative', width: '100%', height: '100%' }}
            >
              {/* Sandbox as background */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <SandboxView />
              </div>

              {/* Overlayed allotment for Editor and BottomPanel so both sit above the sandbox
                  and remain resizable. */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <EditorView
                    toggleMenu={() => setMenu(!menu)}
                    menu={menu}
                    onMenuOpen={() => setMenu(!menu)}
                  />
                  {resourceMonitorEnabled && <PerformanceMonitor />}
                </div>

                {controlOpen && (
                  <ControlPanel
                    floating={true}
                    onClose={() => setControlOpen(!controlOpen)}
                  />
                )}
              </div>
            </div>
          ) : (
            <Allotment>
              <Allotment.Pane minSize={MIN_WINDOW_SIZE} preferredSize="33%">
                <Allotment
                  vertical
                  onChange={(sizes: number[]) => {
                    const second = sizes[1]
                    if (typeof second === 'number') {
                      if (second < 15 && controlOpen) {
                        setControlOpen(false)
                      }
                    }
                  }}
                >
                  <Allotment.Pane minSize={MIN_WINDOW_SIZE} preferredSize="70%">
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        // needed to show allotment border in between editor and params
                        marginLeft: 1,
                      }}
                    >
                      <EditorView
                        toggleMenu={() => setMenu(!menu)}
                        menu={menu}
                        onMenuOpen={() => setMenu(!menu)}
                      />
                    </div>
                  </Allotment.Pane>
                  <Allotment.Pane visible={controlOpen} snap>
                    <ControlPanel
                      onClose={() => setControlOpen(!controlOpen)}
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
                  <SandboxView />
                  {resourceMonitorEnabled && <PerformanceMonitor />}
                </div>
              </Allotment.Pane>
            </Allotment>
          )}
        </Allotment.Pane>
      </Allotment>
    </div>
  )
}

export function CreagenEditorViewContentMobile() {
  const creagenEditor = useCreagenEditor()
  useForceUpdateOnEditorEvent('params:update')
  const hideAll = useSettings('hide_all')
  const [menu, setMenu] = useLocalStorage('menu-view', false)

  useEffect(() => {
    creagenEditor.editor.setFullscreenMode(true)
    return () => {
      creagenEditor.editor.setFullscreenMode(false)
    }
  }, [creagenEditor])

  if (menu) {
    return (
      <>
        <Menu width="100svw" />
        <Actions
          style={{ position: 'fixed', bottom: 10, right: 10 }}
          toggleMenu={() => setMenu(!menu)}
        />
      </>
    )
  }

  if (hideAll) return <SandboxView width="100svw" />

  return (
    <div style={{ height: '100svh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <SandboxView />
        <Actions
          style={{ position: 'fixed', bottom: 10, right: 10 }}
          toggleMenu={() => setMenu(!menu)}
        />
      </div>

      {creagenEditor.params.length > 0 && (
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
