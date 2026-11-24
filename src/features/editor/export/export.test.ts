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
  expect(text).toContain('Inter, ui-sans-serif, system-ui')
  expect(text).not.toContain('is-selected')
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
