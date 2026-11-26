import { beforeEach, expect, test, vi } from 'vitest'
import { createProgram } from '../../../core/model/program'
import { pngFromElement } from './exportPng'
import { svgFromElement } from './exportSvg'
import { downloadFprg, fprgFilename } from './files'

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect
}

function canvasDom(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'canvas'
  container.getBoundingClientRect = () => rect(0, 0, 800, 600)

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '800')
  svg.setAttribute('height', '600')
  const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  edge.setAttribute('class', 'react-flow__edge-path')
  edge.setAttribute('d', 'M 10 10 L 40 40')
  svg.append(edge)
  container.append(svg)

  const node = document.createElement('div')
  node.className = 'flow-node flow-node--term is-selected'
  node.dataset.kind = 'start'
  node.getBoundingClientRect = () => rect(100, 100, 120, 40)
  const label = document.createElement('span')
  label.className = 'flow-node__label'
  label.textContent = 'Mulai'
  node.append(label)
  container.append(node)

  document.body.append(container)
  return container
}

beforeEach(() => {
  document.body.innerHTML = ''
})

test('SVG export keeps labels and edges with font fallbacks', () => {
  const { text, width, height } = svgFromElement(canvasDom())

  expect(width).toBe(800)
  expect(height).toBe(600)
  expect(text).toContain('Mulai')
  expect(text).toContain('M 10 10 L 40 40')
  expect(text).toContain('Nunito Variable, Nunito, ui-sans-serif, system-ui')
  expect(text).not.toContain('is-selected')
})

test('SVG export rebuilds every connector layer and applies the viewport transform', () => {
  const container = document.createElement('div')
  container.className = 'canvas'
  container.getBoundingClientRect = () => rect(0, 0, 800, 600)

  const flow = document.createElement('div')
  flow.className = 'react-flow'
  flow.getBoundingClientRect = () => rect(0, 0, 800, 600)

  const viewport = document.createElement('div')
  viewport.className = 'react-flow__viewport'
  viewport.style.transform = 'translate(12px, 24px) scale(1.5)'

  const edges = document.createElement('div')
  edges.className = 'react-flow__edges'
  const markerLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  markerLayer.setAttribute('class', 'react-flow__marker')
  edges.append(markerLayer)

  for (const [d, arrow] of [
    ['M 10 10 L 40 40', true],
    ['M 60 60 L 90 90', false],
  ] as const) {
    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('class', 'react-flow__edge-path flow-edge__line')
    path.setAttribute('d', d)
    if (arrow) path.setAttribute('marker-end', "url('#raw-marker')")
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('class', 'flow-edge__label')
    label.setAttribute('x', '50')
    label.setAttribute('y', '70')
    label.textContent = 'Yes'
    layer.append(path, label)
    edges.append(layer)
  }

  viewport.append(edges)
  flow.append(viewport)
  container.append(flow)
  document.body.append(container)

  const { text } = svgFromElement(container)

  expect(text).toContain('M 10 10 L 40 40')
  expect(text).toContain('M 60 60 L 90 90')
  expect(text).toContain('translate(12 24) scale(1.5)')
  expect(text).toContain('marcoflow-arrow')
  expect(text).toContain('Yes')
  expect(text).toContain('M 0 0 L 10 5 L 0 10 z')
  expect(text).not.toContain('raw-marker')
})

test('fprg filename defaults to the program name and keeps explicit names', () => {
  const program = createProgram('Hello World')
  expect(fprgFilename(program)).toBe('hello-world.fprg')
  expect(fprgFilename(program, 'custom.fprg')).toBe('custom.fprg')
  expect(fprgFilename(createProgram('   '))).toBe('flowchart.fprg')
})

test('downloadFprg serializes the program and triggers a download', async () => {
  const blobs: Blob[] = []
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      blobs.push(blob)
      return 'blob:marcoflow'
    }),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

  downloadFprg(createProgram('Hello World'))

  expect(click).toHaveBeenCalledTimes(1)
  expect(blobs).toHaveLength(1)
  await expect(blobs[0].text()).resolves.toContain('<flowgorithm')
})

test('PNG export draws at 2x on a canvas and requests image/png', async () => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:marcoflow'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })

  class ImageStub {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', ImageStub)

  const drawImage = vi.fn()
  const fillRect = vi.fn()
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '#fff',
    fillRect,
    drawImage,
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext

  let requested: { width: number; height: number; type?: string } | null = null
  HTMLCanvasElement.prototype.toBlob = function toBlob(callback, type) {
    requested = { width: this.width, height: this.height, type }
    callback(new Blob(['png'], { type: 'image/png' }))
  }

  const result = await pngFromElement(canvasDom(), 2)

  expect(result.width).toBe(1600)
  expect(result.height).toBe(1200)
  expect(requested).toMatchObject({ width: 1600, height: 1200, type: 'image/png' })
  expect(drawImage).toHaveBeenCalledTimes(1)
  expect(fillRect).toHaveBeenCalledWith(0, 0, 1600, 1200)
})
