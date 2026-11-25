import { shapeForKind, shapePath } from '../canvas/shapePaths'
import { downloadText } from './files'

export interface ExportSize {
  width: number
  height: number
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  term: { fill: '#e8f7ef', stroke: '#16a34a' },
  action: { fill: '#eef6ff', stroke: '#2563eb' },
  branch: { fill: '#fff7e6', stroke: '#d97706' },
  note: { fill: '#fef9c3', stroke: '#ca8a04' },
  break: { fill: '#fef2f2', stroke: '#dc2626' },
  other: { fill: '#ffffff', stroke: '#94a3b8' },
}

function measure(element: HTMLElement, svg: SVGSVGElement, size?: ExportSize): ExportSize {
  if (size) return size
  const rect = element.getBoundingClientRect()
  return {
    width: Math.max(1, Math.round(rect.width || Number(svg.getAttribute('width')) || 800)),
    height: Math.max(1, Math.round(rect.height || Number(svg.getAttribute('height')) || 600)),
  }
}

function categoryOf(node: HTMLElement): string {
  const className = Array.from(node.classList).find((name) => name.startsWith('flow-node--'))
  return className ? className.replace('flow-node--', '') : 'other'
}

function drawNodes(
  element: HTMLElement,
  root: SVGSVGElement,
  origin: DOMRect,
): void {
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
      text.setAttribute('font-family', 'Nunito Variable, Nunito, ui-sans-serif, system-ui, sans-serif')
      text.setAttribute('font-size', '12')
      text.setAttribute('font-weight', '600')
      text.setAttribute('fill', '#1f2937')
      text.textContent = label
      group.append(text)
    }

    root.append(group)
  }
}

export function svgFromElement(
  element: HTMLElement,
  size?: ExportSize,
): { text: string; width: number; height: number } {
  const source = element.querySelector('svg')
  if (!source) throw new Error('The canvas is not available to export.')

  const { width, height } = measure(element, source, size)
  const clone = source.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  clone.querySelectorAll('.is-selected').forEach((node) => node.classList.remove('is-selected'))

  const background = document.createElementNS(SVG_NS, 'rect')
  background.setAttribute('x', '0')
  background.setAttribute('y', '0')
  background.setAttribute('width', String(width))
  background.setAttribute('height', String(height))
  background.setAttribute('fill', '#ffffff')
  clone.insertBefore(background, clone.firstChild)

  const style = document.createElementNS(SVG_NS, 'style')
  style.textContent = [
    'text { font-family: Nunito Variable, Nunito, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }',
    '.react-flow__edge-path { fill: none; stroke: #94a3b8; stroke-width: 1.6; }',
    '.react-flow__edge-text { fill: #475569; font-size: 11px; font-weight: 600; }',
  ].join('\n')
  clone.insertBefore(style, background.nextSibling)

  drawNodes(element, clone, element.getBoundingClientRect())

  return { text: new XMLSerializer().serializeToString(clone), width, height }
}

export function exportSvg(element: HTMLElement, filename = 'flowchart.svg'): string {
  const { text } = svgFromElement(element)
  downloadText(text, filename, 'image/svg+xml')
  return text
}

export { downloadText }
