// This file is used to run code in a sandboxed environment

import {
  AnalyzeContainerResult,
  SandboxEvent,
  SvgProps,
} from './src/components/Sandbox'

function postMessage(event: SandboxEvent) {
  // filter out all functions and unclonable objects (like DOM elements)
  const serializedEvent = JSON.parse(JSON.stringify(event))
  parent.postMessage(serializedEvent, '*')
}

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
  document.addEventListener('DOMContentLoaded', () => {
    postMessage({ type: 'loaded' })
  })
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
  setTimeout(() => {
    const result = analyzeContainer(document.body)
    postMessage({ type: 'analysis', result })
  }, 500)
}
