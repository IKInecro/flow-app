import { svgFromElement } from './exportSvg'
import { downloadBlob } from './files'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the canvas image.'))
    image.src = url
  })
}

export async function pngFromElement(
  element: HTMLElement,
  scale = 2,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (typeof URL.createObjectURL !== 'function') {
    throw new Error('This browser cannot export images.')
  }
  const { text, width, height } = svgFromElement(element)
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }))
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not available.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), 'image/png'),
    )
    if (!blob) throw new Error('Could not create the PNG.')
    return { blob, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function exportPng(
  element: HTMLElement,
  filename = 'flowchart.png',
  scale = 2,
): Promise<void> {
  const { blob } = await pngFromElement(element, scale)
  downloadBlob(blob, filename)
}
