import React, { useEffect } from 'react'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import { EditorView } from '../editor/EditorView'
import { SandboxView } from '../sandbox/SandboxView'
import { Menu } from '../editor/Menu'
import { useSettings } from '../events/useEditorEvents'
import { useLocalStorage } from '../storage/useLocalStorage'
import { Actions } from './Actions'
import { useCreagenEditor } from './CreagenEditorView'
import { PerformanceMonitor } from '../sandbox/PerformanceMonitor'
import { ParamsView } from '../params/ParamsView'

const MIN_WINDOW_SIZE = 200

/**
 * Split view with resizable panels using Allotment
 */
export function CreagenEditorViewSplit() {
  const creagenEditor = useCreagenEditor()
  let fullscreen = useSettings('editor.fullscreen')
  const hideAll = useSettings('hide_all')
  const resourceMonitorEnabled = useSettings('sandbox.resource_monitor')
  fullscreen = hideAll ? true : fullscreen

  const [menu, setMenu] = useLocalStorage('menu-view', false)

  // Layout the editor when the menu or fullscreen state changes
  useEffect(() => {
    creagenEditor.editor.layout()
  }, [menu, fullscreen, creagenEditor])

  if (hideAll) {
    return <SandboxView />
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
              <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <SandboxView />
              </div>
              <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                <EditorView
                  toggleMenu={() => setMenu(!menu)}
                  menu={menu}
                  onMenuOpen={() => setMenu(!menu)}
                />
              </div>
              {resourceMonitorEnabled && <PerformanceMonitor />}
            </div>
          ) : (
            <Allotment>
              <Allotment.Pane minSize={MIN_WINDOW_SIZE} preferredSize="33%">
                <Allotment vertical>
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
                  <Allotment.Pane minSize={100}>
                    <ParamsView />
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
    <>
      <EditorView
        width="100svw"
        toggleMenu={() => setMenu(!menu)}
        menu={menu}
        onMenuOpen={() => setMenu(!menu)}
      />
      <SandboxView width="100svw" />
    </>
  )
}
