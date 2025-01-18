import React, { Children, PropsWithChildren, useState } from 'react'

/**
 * Split two given children and make them resizable
 *
 * each child must have a width prop
 */
export function VerticalSplitResizer({ children }: PropsWithChildren) {
  const [width, setWidth] = useState(window.innerWidth / 4)
  const childrenArray = Children.toArray(children)
  if (childrenArray.length !== 2)
    throw Error('Resizer must have exactly 2 children')

  function handleResize(e: MouseEvent) {
    if (e.clientX < 200 || e.clientX > window.innerWidth - 200) return
    setWidth(e.clientX)
  }
  //on mouseup remove windows functions mousemove & mouseup
  function stopResize() {
    window.removeEventListener('mousemove', handleResize, false)
    window.removeEventListener('mouseup', stopResize, false)
  }

  return (
    <div style={{ display: 'flex' }}>
      {React.cloneElement(childrenArray[0] as any, { width: `${width}px` })}
      <div
        style={{
          top: 0,
          left: width,
          zIndex: 1001,
          // layer above sandbox which captures mouse events
          width: '800px',
          height: '100%',
          position: 'absolute',
        }}
      >
        <div
          onMouseDown={() => {
            window.addEventListener('mousemove', handleResize, false)
            window.addEventListener('mouseup', stopResize, false)
          }}
          style={{
            cursor: 'ew-resize',
            height: '100%',
            width: '3px',
          }}
        />
        {childrenArray[1]}
      </div>
      {React.cloneElement(childrenArray[1] as any, {
        width: `${window.innerWidth - width}px`,
      })}
    </div>
  )
}
