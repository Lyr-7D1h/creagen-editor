import {
  AnalyzeContainerResult,
  SvgProps,
} from '../src/sandbox/SandboxMessageHandler'

export function analyzeContainer(
  container: HTMLElement,
  result: AnalyzeContainerResult = { svgs: [] },
): AnalyzeContainerResult {
  for (const c of Array.from(container.children)) {
    switch (c.tagName.toLocaleLowerCase()) {
      case 'svg': {
        // set custom attribute to track this svg
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
