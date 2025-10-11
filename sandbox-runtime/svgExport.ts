import { SandboxMessageByType } from '../src/sandbox/SandboxMessageHandler'

export function svgExportRequest({
  head,
  svgIndex,
  optimize,
}: SandboxMessageByType<'svgExportRequest'>) {
  let svg = document.querySelector<SVGElement>(
    `[data-creagen-svg="${svgIndex}"]`,
  )
  if (!svg) {
    return null
  }

  if (optimize) {
    optimizeSvg(svg)
  }

  svg = svg.cloneNode(true) as SVGElement
  svg.removeAttribute('data-creagen-svg')

  // TODO: add params used, code hash, date generated
  const metadata = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'metadata',
  )
  const creagen = document.createElement('creagen')
  if (head) creagen.setAttribute('id', head)
  metadata.appendChild(creagen)
  svg.appendChild(metadata)

  const htmlStr = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${svg.outerHTML}`
  const blob = new Blob([htmlStr], { type: 'image/svg+xml' })

  return blob
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
