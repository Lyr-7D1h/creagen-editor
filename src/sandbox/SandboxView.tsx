import React, { useEffect, useState } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { useSettings } from '../events/useEditorEvents'
import { PerformanceMonitor } from './PerformanceMonitor'

export function SandboxView({
  width,
  ref,
}: {
  width?: string
  ref?: React.RefObject<HTMLDivElement | null>
}) {
  const creagenEditor = useCreagenEditor()
  const resourceMonitorEnabled = useSettings('sandbox.resource_monitor')
  const [stats, setStats] = useState({
    averageFPS: 0,
    averageFrameTime: 0,
    maxFrameTime: 0,
    minFrameTime: 0,
  })

  useEffect(() => {
    if (resourceMonitorEnabled) {
      const id = setInterval(() => {
        const currentStats = creagenEditor.resourceMonitor.getStats()
        setStats({
          averageFPS: currentStats.averageFPS,
          averageFrameTime: currentStats.averageFrameTime,
          maxFrameTime: currentStats.maxFrameTime,
          minFrameTime: currentStats.minFrameTime,
        })
      }, 200)

      return () => {
        clearInterval(id)
      }
    }
    return
  }, [resourceMonitorEnabled, creagenEditor.resourceMonitor])

  useEffect(() => {
    if (!ref?.current) return
    const container = ref.current
    if (container) {
      const htmlElement = creagenEditor.sandbox.html()
      container.appendChild(htmlElement)
    }
  }, [ref])

  return (
    <div
      ref={ref}
      style={{
        width,
        border: 'none',
        position: 'absolute',
        display: 'flex',
        height: '100svh',
      }}
    >
      {resourceMonitorEnabled && <PerformanceMonitor stats={stats} />}
    </div>
  )
}
