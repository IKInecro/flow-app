import { serializeFprg } from '../../../core/fprg/serialize'
import type { Program } from '../../../core/model/types'

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof URL.createObjectURL !== 'function') {
    throw new Error('Browser tidak mendukung unduhan file.')
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadText(text: string, filename: string, type = 'text/plain'): void {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename)
}

function slug(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'flowchart'
}

export function fprgFilename(program: Program, filename?: string): string {
  return filename ?? `${slug(program.meta.name || 'flowchart')}.fprg`
}

export function downloadFprg(program: Program, filename?: string): void {
  downloadText(serializeFprg(program), fprgFilename(program, filename), 'application/xml')
}
