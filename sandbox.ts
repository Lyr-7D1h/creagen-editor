// This file is used to run code in a sandboxed environment

// import type {SandboxEvent } from './src/components/Sandbox'
import {
  AnalyzeContainerResult,
  SandboxEvent,
  SvgProps,
} from './src/components/Sandbox'
import { Library } from './src/SettingsProvider'

declare global {
  interface Window {
    creagen: {
      constants: {
        creagenEditorVersion: string
      }
    }
  }
}
window.creagen = {
  constants: {
    creagenEditorVersion: '',
  },
}

function postMessage(event: SandboxEvent) {
  // filter out all functions and unclonable objects (like DOM elements)
  const serializedEvent = JSON.parse(JSON.stringify(event))
  parent.postMessage(serializedEvent, '*')
}

// send console logs to the parent window
try {
  window.console = {
    ...window.console,
    debug: (...args) =>
      postMessage({ type: 'log', level: 'debug', data: args }),
    info: (...args) => postMessage({ type: 'log', level: 'info', data: args }),
    log: (...args) => postMessage({ type: 'log', level: 'info', data: args }),
    error: (...args) =>
      postMessage({ type: 'log', level: 'error', data: args }),
  }
} catch (error) {
  postMessage({ type: 'error', error: error as Error })
}

function analyzeContainer(container: HTMLElement): AnalyzeContainerResult {
  const result: AnalyzeContainerResult = { svgs: [] }
  for (const c of Array.from(container.children)) {
    switch (c.tagName.toLocaleLowerCase()) {
      case 'svg': {
        // add svg information
        result.svgs.push({
          ...analyzeSvg(c),
        })
      }
    }
  }
  return result
}

function analyzeSvg(html: Element): SvgProps {
  let paths = 0
  let circles = 0
  let rects = 0
  for (const c of Array.from(html.children)) {
    switch (c.tagName.toLocaleLowerCase()) {
      case 'path':
        const d = c.getAttribute('d')
        if (d === null || d.length === 0) {
          console.warn('Path has no d attribute')
          continue
        }
        paths++
        break
      case 'circle':
        circles++
        break
      case 'rect':
        rects++
        break
    }

    const { paths: p, circles: ci, rects: r } = analyzeSvg(c)

    paths += p
    circles += ci
    rects += r
  }

  if (html.tagName === 'svg') {
    const height = Number(html.getAttribute('height')) ?? undefined
    const width = Number(html.getAttribute('width')) ?? undefined
    return { paths, circles, rects, width, height }
  }

  return { paths, circles, rects }
}

window.onload = () => {
  postMessage({ type: 'loaded' })
  setTimeout(() => {
    const analysisResult = analyzeContainer(document.body)
    postMessage({ type: 'analysisResult', analysisResult })
  }, 500)
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.origin) {
    throw Error(`Invalid origin ${event.origin} should be ${window.origin}`)
  }
  const sandboxEvent = event.data
  if (isSandboxEvent(sandboxEvent)) {
    switch (sandboxEvent.type) {
      case 'init':
        window.creagen.constants = sandboxEvent.constants
        break
      case 'svgExportRequest':
        const svg = document.querySelector('svg')
        if (!svg) {
          postMessage({ type: 'svgExportResponse', data: null })
          return
        }
        exportSvg(svg, {
          libraries: sandboxEvent.libraries,
          name: 'asdf',
          optimize: sandboxEvent.optimize,
        })
        postMessage({ type: 'svgExportResponse', data: null })
        break
    }
  }
})

function isSandboxEvent(event: any): event is SandboxEvent {
  return event && typeof event.type === 'string'
}

function exportSvg(
  svg: SVGElement,
  opts: { optimize: boolean; name: string; libraries: Library[] },
) {
  svg = svg.cloneNode(true) as SVGElement

  if (opts.optimize) {
    optimizeSvg(svg)
  }

  // TODO: add params used, code hash, date generated
  const metadata = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'metadata',
  )
  const creagen = document.createElement('creagen')
  creagen.setAttribute(
    'libraries',
    opts.libraries.map((l) => `${l.name}@${l.version}`).join(','),
  )
  creagen.setAttribute(
    'editor-version',
    window.creagen.constants.creagenEditorVersion,
  )
  creagen.setAttribute('date-generated', new Date().toISOString())

  metadata.appendChild(creagen)
  svg.appendChild(metadata)

  const htmlStr = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${svg.outerHTML}`
  const blob = new Blob([htmlStr], { type: 'image/svg+xml' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('download', `${opts.name}.svg`)
  a.setAttribute('href', url)
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function optimizeSvg(html: Element) {
  for (const c of Array.from(html.children)) {
    switch (c.tagName.toLocaleLowerCase()) {
      case 'path':
        // TODO: fix for http://localhost:5173/af438744df3a711f006203aaa39cd24e157f0f16f59ddfd6c93ea8ba00624032302e302e313a313733363532363839323337353a5b2267656e61727440302e302e35225d
        // if (optimizePath(c as SVGPathElement, opts)) {
        //   c.remove()
        // }
        break
      case 'circle':
        break
      case 'rect':
        break
    }

    optimizeSvg(c)
  }
}
