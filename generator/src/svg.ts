export interface PathOptions {
  stroke?: string
  strokeWidth?: string
}
export function path(path: string, opt?: PathOptions): SVGPathElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  svg.setAttribute('d', path)
  svg.style.stroke = opt?.stroke ?? '#000'
  svg.style.strokeWidth = opt?.stroke ?? '0.4'
  return svg
}
export function circle(r: number, cx?: number, cy?: number): SVGCircleElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  svg.setAttribute('r', r.toString())
  if (cx) svg.setAttribute('cx', cx.toString())
  if (cy) svg.setAttribute('cy', cy.toString())
  return svg
}
