import { shapeForKind, shapePath } from '../canvas/shapePaths'
import { downloadText } from './files'

export interface ExportSize {
  width: number
  height: number
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const EDGE_STROKE = '#94a3b8'
const LABEL_FILL = '#475569'
const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  term: { fill: '#e8f7ef', stroke: '#16a34a' },
  action: { fill: '#eef6ff', stroke: '#2563eb' },
  branch: { fill: '#fff7e6', stroke: '#d97706' },
  note: { fill: '#fef9c3', stroke: '#ca8a04' },
  break: { fill: '#fef2f2', stroke: '#dc2626' },
  other: { fill: '#ffffff', stroke: '#94a3b8' },
}

function measure(element: HTMLElement, size?: ExportSize): ExportSize {
  if (size) return size
  const rect = element.getBoundingClientRect()
  return {
    width: Math.max(1, Math.round(rect.width || 800)),
    height: Math.max(1, Math.round(rect.height || 600)),
  }
}

function categoryOf(node: HTMLElement): string {
  const className = Array.from(node.classList).find((name) => name.startsWith('flow-node--'))
  return className ? className.replace('flow-node--', '') : 'other'
}

function drawNodes(element: HTMLElement, root: SVGSVGElement, origin: DOMRect): void {
  const nodes = Array.from(element.querySelectorAll<HTMLElement>('.flow-node'))
  for (const node of nodes) {
    const rect = node.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width || node.offsetWidth || 150))
    const height = Math.max(1, Math.round(rect.height || node.offsetHeight || 44))
    const x = Math.round(rect.left - origin.left)
    const y = Math.round(rect.top - origin.top)
    const kind = node.dataset.kind ?? 'assign'
    const colors = NODE_COLORS[categoryOf(node)] ?? NODE_COLORS.other
    const group = document.createElementNS(SVG_NS, 'g')
    group.setAttribute('transform', `translate(${x} ${y})`)

    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', shapePath(shapeForKind(kind), width, height))
    path.setAttribute('fill', colors.fill)
    path.setAttribute('stroke', colors.stroke)
    path.setAttribute('stroke-width', '1.6')
    group.append(path)

    const label = node.querySelector('.flow-node__label')?.textContent?.trim()
    if (label) {
      const text = document.createElementNS(SVG_NS, 'text')
      text.setAttribute('x', String(width / 2))
      text.setAttribute('y', String(height / 2))
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('dominant-baseline', 'middle')
      text.setAttribute('font-size', '12')
      text.setAttribute('font-weight', '600')
      text.setAttribute('fill', '#1f2937')
      text.textContent = label
      group.append(text)
    }

    root.append(group)
  }
}

function viewportTransform(viewport: Element | null): string | null {
  if (!viewport || !(viewport instanceof HTMLElement)) return null
  const inline = viewport.style.transform
  const transform = inline && inline !== 'none' ? inline : getComputedStyle(viewport).transform
  if (!transform || transform === 'none') return null

  // React Flow sets `translate(Xpx, Ypx) scale(Z)` inline; SVG needs units off.
  const pan = transform.match(
    /translate\(\s*(-?[\d.]+)px(?:\s*,\s*|\s+)(-?[\d.]+)px\s*\)\s*scale\(\s*(-?[\d.]+)\s*\)/,
  )
  if (pan) {
    const [x, y, zoom] = pan.slice(1).map(Number)
    if ([x, y, zoom].every(Number.isFinite)) {
      return `translate(${x} ${y}) scale(${zoom})`
    }
  }

  const match = transform.match(/matrix\(([^)]+)\)/)
  if (!match) return null
  const values = match[1].split(/[\s,]+/).map(Number)
  if (values.length !== 6 || !values.every(Number.isFinite)) return null
  return `matrix(${values.join(' ')})`
}

/**
 * Rebuilds the connector layer from the rendered edges. React Flow splits its
 * canvas into several SVGs (an empty marker layer, one layer per z-index, the
 * background, the minimap), so cloning the first SVG drops every connector.
 */
function drawEdges(
  element: HTMLElement,
  root: SVGSVGElement,
  markerId: string,
  fallback: SVGSVGElement | null,
): void {
  const group = document.createElementNS(SVG_NS, 'g')
  const transform = viewportTransform(element.querySelector('.react-flow__viewport'))
  if (transform) group.setAttribute('transform', transform)

  const rendered = Array.from(element.querySelectorAll<SVGPathElement>('.react-flow__edge-path'))
  const paths = rendered.length ? rendered : Array.from(fallback?.querySelectorAll<SVGPathElement>('.react-flow__edge-path') ?? [])
  for (const edge of paths) {
    const d = edge.getAttribute('d')
    if (!d) continue
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', EDGE_STROKE)
    path.setAttribute('stroke-width', '1.7')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    // Merge joints never carried an arrowhead in the editor; keep it that way.
    if (edge.hasAttribute('marker-end')) path.setAttribute('marker-end', `url(#${markerId})`)
    group.append(path)
  }

  const labels = Array.from(element.querySelectorAll<SVGTextElement>('.flow-edge__label'))
  if (!labels.length && fallback) {
    labels.push(...Array.from(fallback.querySelectorAll<SVGTextElement>('text')))
  }
  for (const label of labels) {
    const content = label.textContent?.trim()
    if (!content) continue
    const text = document.createElementNS(SVG_NS, 'text')
    text.setAttribute('x', label.getAttribute('x') ?? '0')
    text.setAttribute('y', label.getAttribute('y') ?? '0')
    text.setAttribute('text-anchor', label.getAttribute('text-anchor') ?? 'middle')
    text.setAttribute('dominant-baseline', label.getAttribute('dominant-baseline') ?? 'central')
    text.setAttribute('font-size', '11')
    text.setAttribute('font-weight', '600')
    text.setAttribute('fill', LABEL_FILL)
    text.textContent = content
    group.append(text)
  }

  if (group.childElementCount > 0) root.append(group)
}

function drawArrow(root: SVGSVGElement, id: string): void {
  const defs = document.createElementNS(SVG_NS, 'defs')
  const marker = document.createElementNS(SVG_NS, 'marker')
  marker.setAttribute('id', id)
  marker.setAttribute('viewBox', '0 0 10 10')
  marker.setAttribute('refX', '9')
  marker.setAttribute('refY', '5')
  marker.setAttribute('markerWidth', '7')
  marker.setAttribute('markerHeight', '7')
  marker.setAttribute('orient', 'auto-start-reverse')
  const arrow = document.createElementNS(SVG_NS, 'path')
  arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z')
  arrow.setAttribute('fill', EDGE_STROKE)
  marker.append(arrow)
  defs.append(marker)
  root.append(defs)
}

export function svgFromElement(
  element: HTMLElement,
  size?: ExportSize,
): { text: string; width: number; height: number } {
  if (!element.querySelector('svg')) {
    throw new Error('The canvas is not available to export.')
  }

  const { width, height } = measure(element, size)
  const fallback = element.querySelector<SVGSVGElement>('svg')
  const flowRoot = element.querySelector<HTMLElement>('.react-flow') ?? element
  const origin = flowRoot.getBoundingClientRect()
  const markerId = 'marcoflow-arrow'

  const root = document.createElementNS(SVG_NS, 'svg')
  root.setAttribute('xmlns', SVG_NS)
  root.setAttribute('width', String(width))
  root.setAttribute('height', String(height))
  root.setAttribute('viewBox', `0 0 ${width} ${height}`)

  const background = document.createElementNS(SVG_NS, 'rect')
  background.setAttribute('x', '0')
  background.setAttribute('y', '0')
  background.setAttribute('width', String(width))
  background.setAttribute('height', String(height))
  background.setAttribute('fill', '#ffffff')
  root.append(background)

  drawArrow(root, markerId)
  drawEdges(element, root, markerId, fallback)
  drawNodes(element, root, origin)

  const style = document.createElementNS(SVG_NS, 'style')
  style.textContent = [
    'text { font-family: Nunito Variable, Nunito, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }',
  ].join('\n')
  root.insertBefore(style, background)

  return { text: new XMLSerializer().serializeToString(root), width, height }
}

export function exportSvg(element: HTMLElement, filename = 'flowchart.svg'): string {
  const { text } = svgFromElement(element)
  downloadText(text, filename, 'image/svg+xml')
  return text
}

export { downloadText }
