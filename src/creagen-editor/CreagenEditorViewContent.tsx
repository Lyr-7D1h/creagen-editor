import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from '@mui/material'
import { EditorView } from '../editor/EditorView'
import { SandboxView } from '../sandbox/SandboxView'
import { Menu } from '../editor/Menu'
import { Export } from './Export'
import { useSettings } from '../events/useEditorEvents'
import { useLocalStorage } from '../storage/useLocalStorage'

const RESIZER_WIDTH_PX = 3

function Resizer({
  resizing,
  left,
  onResize,
  hidden,
}: {
  left: number
  resizing: boolean
  onResize: () => void
  hidden?: boolean
}) {
  const theme = useTheme()
  return (
    <>
      <div
        onMouseDown={onResize}
        style={{
          cursor: 'ew-resize',
          height: '100%',
          width: RESIZER_WIDTH_PX + 'px',
          position: 'absolute',
          borderLeft: resizing
            ? `2px solid ${theme.palette.primary.main}`
            : hidden
              ? undefined
              : `2px solid ${theme.palette.divider}`,
          top: 0,
          left: left + 'px',
          zIndex: 1001,
        }}
      />
      {/* mouse capturing box */}
      {resizing && (
        <div
          style={{
            top: 0,
            // resize until reaching other full width
            left: Math.min(left - 400, window.innerWidth - 810) + 'px',
            zIndex: 1001,
            // layer above other window that might capture mouse events
            width: '800px',
            height: '100%',
            position: 'absolute',
            overflow: 'hidden',
          }}
        />
      )}
    </>
  )
}

/**
 * Split two given children and make them resizable
 *
 * each child must have a width prop
 */
export function CreagenEditorViewContent() {
  const [menuWidth, setMenuWidth] = useState<number>(window.innerWidth / 4)
  const [editorWidth, setEditorWidth] = useState<number>(window.innerWidth / 4)

  let fullscreen = useSettings('editor.fullscreen')
  const hideAll = useSettings('hide_all')
  fullscreen = hideAll ? true : fullscreen

  const exportEnabled = useSettings('export.enabled')

  const [resizing, setResizing] = useState<null | number>(null)
  const [menu, setMenu] = useLocalStorage('menu-view', false)

  const currentResizerRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.clientX < 200 || e.clientX > window.innerWidth - 200) return

    const resizer = currentResizerRef.current
    if (resizer === 0) {
      // Use requestAnimationFrame to throttle updates
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          setEditorWidth(e.clientX)
          animationFrameRef.current = null
        })
      }
    } else if (resizer === 1) {
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          setMenuWidth(e.clientX)
          animationFrameRef.current = null
        })
      }
    }
  }, [])

  const stopResize = useCallback(() => {
    setResizing(null)
    currentResizerRef.current = null
    window.removeEventListener('mousemove', handleMouseMove, false)
    window.removeEventListener('mouseup', stopResize, false)
  }, [handleMouseMove])

  const handleResize = useCallback(
    (resizer: number) => {
      setResizing(resizer)
      currentResizerRef.current = resizer
      window.addEventListener('mousemove', handleMouseMove, false)
      window.addEventListener('mouseup', stopResize, false)
    },
    [handleMouseMove, stopResize],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentResizerRef.current !== null) {
        window.removeEventListener('mousemove', handleMouseMove, false)
        window.removeEventListener('mouseup', stopResize, false)
      }
    }
  }, [handleMouseMove, stopResize])

  return (
    <div style={{ display: 'flex' }}>
      {fullscreen === false && (
        <Resizer
          resizing={resizing === 0}
          left={menu ? editorWidth + menuWidth : editorWidth}
          hidden={true}
          onResize={() => handleResize(0)}
        />
      )}

      {menu === true ? (
        <>
          <Menu width={menuWidth} />
          <Resizer
            resizing={resizing === 1}
            hidden={false}
            left={menuWidth}
            onResize={() => handleResize(1)}
          />
        </>
      ) : (
        ''
      )}

      {exportEnabled ? (
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <Export />
        </div>
      ) : (
        ''
      )}

      <EditorView
        left={(menu ? menuWidth + RESIZER_WIDTH_PX : 0) + 'px'}
        width={
          (fullscreen
            ? menu
              ? window.innerWidth - (menuWidth + RESIZER_WIDTH_PX)
              : window.innerWidth
            : editorWidth) + 'px'
        }
        menu={menu}
        onMenuOpen={() => setMenu(!menu)}
        height={'100vh'}
      />
      <SandboxView
        left={
          (fullscreen
            ? menu
              ? menuWidth + RESIZER_WIDTH_PX
              : 0
            : menu
              ? menuWidth + editorWidth + RESIZER_WIDTH_PX
              : editorWidth) + 'px'
        }
        height={`100vh`}
        width={
          (fullscreen
            ? menu
              ? window.innerWidth - (menuWidth + RESIZER_WIDTH_PX)
              : window.innerWidth
            : window.innerWidth - editorWidth) + 'px'
        }
      />
    </div>
  )
}
