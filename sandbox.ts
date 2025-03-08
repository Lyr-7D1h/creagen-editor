// This file is used to run code in a sandboxed environment

// import type {SandboxEvent } from './src/components/Sandbox'
import {
  AnalyzeContainerResult,
  SandboxEvent,
  SvgProps,
} from './src/components/Sandbox/Sandbox'
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

function analyzeContainer(
  container: HTMLElement,
  result: AnalyzeContainerResult = { svgs: [] },
): AnalyzeContainerResult {
  for (const c of Array.from(container.children)) {
    switch (c.tagName.toLocaleLowerCase()) {
      case 'svg': {
        c.setAttribute('data-creagen-svg', result.svgs.length.toString())
        // add svg information
        result.svgs.push({
          ...analyzeSvg(c),
        })
        break
      }
      default: {
        if (c.children.length > 0) {
          analyzeContainer(c as HTMLElement, result)
        }
        break
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
        svgExportRequest(sandboxEvent)
        break
    }
  }
})

function isSandboxEvent(event: any): event is SandboxEvent {
  return event && typeof event.type === 'string'
}

function svgExportRequest(opts: { optimize: boolean; svgIndex: number }) {
  let svg = document.querySelector<SVGElement>(
    `[data-creagen-svg="${opts.svgIndex}"]`,
  )
  if (!svg) {
    postMessage({ type: 'svgExportResponse', data: null })
    return
  }
  if (opts.optimize) {
    optimizeSvg(svg)
  }
  svg = svg.cloneNode(true) as SVGElement
  svg.removeAttribute('data-creagen-svg')

  postMessage({ type: 'svgExportResponse', data: svg.outerHTML })
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
