import React, { useEffect, useState, useRef, useCallback } from 'react'
import { EditorView } from '../editor/EditorView'
import { SandboxView } from '../sandbox/SandboxView'
import { Menu } from '../editor/Menu'
import { useSettings } from '../events/useEditorEvents'
import { useLocalStorage } from '../storage/useLocalStorage'
import { Actions } from './Actions'
import { Resizer } from './Resizer'
import { isMobile, useCreagenEditor } from './CreagenEditorView'

const MIN_WINDOW_SIZE = 200

const DEFAULT_EDITOR_WIDTH = Math.round(window.innerWidth / 3)

/**
 * Split two given children and make them resizable
 *
 * each child must have a width prop
 */
export function CreagenEditorViewContent() {
  const creagenEditor = useCreagenEditor()
  const resizer0 = useRef<HTMLDivElement>(null)
  const resizer1 = useRef<HTMLDivElement>(null)

  const editorRef = useRef<HTMLDivElement>(null)
  const sandboxRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  let fullscreen = useSettings('editor.fullscreen')
  const hideAll = useSettings('hide_all')
  fullscreen = hideAll ? true : fullscreen

  const [resizing, setResizing] = useState<null | number>(null)
  const [menu, setMenu] = useLocalStorage('menu-view', false)

  const currentResizerRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // don't allow resizing past a certain point
    if (
      e.clientX < MIN_WINDOW_SIZE ||
      e.clientX > window.innerWidth - MIN_WINDOW_SIZE
    )
      return

    const resizer = currentResizerRef.current
    switch (resizer) {
      case 0:
        if (e.clientX > window.innerWidth - MIN_WINDOW_SIZE * 2) return
        // Use requestAnimationFrame to throttle updates
        if (animationFrameRef.current) return
        animationFrameRef.current = requestAnimationFrame(() => {
          if (
            !menuRef.current ||
            !editorRef.current ||
            !sandboxRef.current ||
            !resizer0.current
          )
            return
          menuRef.current.style.width = e.clientX + 'px'
          // TODO(perf): use translate
          editorRef.current.style.left = e.clientX + 'px'
          resizer0.current.style.left = e.clientX + 'px'
          if (resizer1.current)
            resizer1.current.style.left =
              e.clientX + editorRef.current.clientWidth + 'px'
          sandboxRef.current.style.width =
            window.innerWidth -
            (e.clientX + editorRef.current.clientWidth) +
            'px'
          sandboxRef.current.style.left =
            window.innerWidth - sandboxRef.current.clientWidth + 'px'

          animationFrameRef.current = null
        })
        return
      case 1:
        if (animationFrameRef.current) return
        animationFrameRef.current = requestAnimationFrame(() => {
          if (!resizer1.current || !editorRef.current || !sandboxRef.current)
            return
          resizer1.current.style.left = e.clientX + 'px'
          editorRef.current.style.width =
            e.clientX -
            (menuRef.current ? menuRef.current.clientWidth : 0) +
            'px'

          sandboxRef.current.style.width = window.innerWidth - e.clientX + 'px'
          sandboxRef.current.style.left =
            window.innerWidth - sandboxRef.current.clientWidth + 'px'

          animationFrameRef.current = null
        })
        return
      default:
        throw Error(`Unknown resizer ${resizer}`)
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

  /** Disable text selection on resizing */
  useEffect(() => {
    const originalUserSelect = document.body.style.userSelect
    const originalCursor = document.body.style.cursor

    if (resizing !== null) {
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    }

    return () => {
      document.body.style.userSelect = originalUserSelect
      document.body.style.cursor = originalCursor
    }
  }, [resizing])

  // set width on fullscreen
  useEffect(() => {
    if (!editorRef.current || !sandboxRef.current) return
    const menuWidth = menuRef.current ? menuRef.current?.clientWidth : 0
    if (fullscreen) {
      editorRef.current.style.width = window.innerWidth - menuWidth + 'px'
      sandboxRef.current.style.width = window.innerWidth + 'px'
      sandboxRef.current.style.left = '0px'
    } else {
      editorRef.current.style.width = DEFAULT_EDITOR_WIDTH + 'px'
      const editorWidth = editorRef.current.clientWidth
      sandboxRef.current.style.width =
        window.innerWidth - menuWidth - editorWidth + 'px'
      sandboxRef.current.style.left = editorWidth + 'px'
      if (resizer1.current)
        resizer1.current.style.left =
          menuWidth + editorRef.current.clientWidth + 'px'
    }
  }, [menu, fullscreen])

  // set position on menu toggle
  useEffect(() => {
    if (!editorRef.current) return
    if (menu && menuRef.current) {
      editorRef.current.style.left = menuRef.current.clientWidth + 'px'
      if (resizer0.current)
        resizer0.current.style.left = menuRef.current.clientWidth + 'px'
      if (resizer1.current)
        resizer1.current.style.left =
          menuRef.current.clientWidth + editorRef.current.clientWidth + 'px'
    } else {
      editorRef.current.style.left = '0px'
      if (resizer1.current)
        resizer1.current.style.left = editorRef.current.clientWidth + 'px'
    }
  }, [menu])

  // resize on window resize
  useEffect(() => {
    if (creagenEditor === null) return
    const checkScreenSize = () => {
      if (!editorRef.current || !resizer1.current || !sandboxRef.current) return
      const menuWidth = menuRef.current ? menuRef.current.clientWidth : 0
      const editorWidth = editorRef.current.clientWidth
      const newSandboxWidth = window.innerWidth - (menuWidth + editorWidth)

      if (newSandboxWidth < MIN_WINDOW_SIZE) {
        const newEditorWidth = window.innerWidth - menuWidth - MIN_WINDOW_SIZE
        if (newEditorWidth > MIN_WINDOW_SIZE) {
          editorRef.current.style.width = `${newEditorWidth}px`
          resizer1.current.style.left = `${menuWidth + newEditorWidth}px`
          sandboxRef.current.style.width = `${MIN_WINDOW_SIZE}px`
        }
      } else {
        sandboxRef.current.style.width = `${newSandboxWidth}px`
      }
    }
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [creagenEditor])

  if (hideAll) {
    return <SandboxView ref={sandboxRef} />
  }

  return (
    <div style={{ display: 'flex' }}>
      {menu === true ? (
        <>
          <Menu ref={menuRef} />
          <Resizer
            ref={resizer0}
            resizing={resizing === 0}
            hidden={false}
            onResize={() => handleResize(0)}
          />
        </>
      ) : (
        ''
      )}

      <EditorView
        ref={editorRef}
        toggleMenu={() => setMenu(!menu)}
        menu={menu}
        onMenuOpen={() => setMenu(!menu)}
      />
      {fullscreen === false && (
        <Resizer
          ref={resizer1}
          resizing={resizing === 1}
          hidden={true}
          onResize={() => handleResize(1)}
        />
      )}
      <SandboxView ref={sandboxRef} />
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
  }, [])

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
      <Actions
        style={{ position: 'fixed', bottom: 10, right: 10 }}
        toggleMenu={() => setMenu(!menu)}
      />
      <SandboxView width="100svw" />
    </>
  )
}
