import { parseTemplate, type ParseResult, type Template } from '../codegen/template'

const sources = import.meta.glob('./data/*.fpgt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface TemplateInfo {
  id: string
  name: string
  extension: string
  kind: 'language' | 'pseudocode'
}

const PSEUDOCODE = new Set(['pseudo-auto', 'pseudo-gaddis', 'pseudo-ibo'])
const sourceById = new Map<string, string>()
for (const [path, text] of Object.entries(sources)) {
  sourceById.set(stem(path), text)
}

const builtinCache = new Map<string, Template>()
const customTemplates = new Map<string, Template>()

function stem(path: string): string {
  const file = path.split('/').pop() ?? path
  return file.replace(/\.fpgt$/i, '')
}

function slug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'custom'
}

function infoFor(id: string, template: Template): TemplateInfo {
  return {
    id,
    name: template.language || id,
    extension: template.extension,
    kind: PSEUDOCODE.has(id) || id.startsWith('pseudo-') ? 'pseudocode' : 'language',
  }
}

export function listTemplates(): TemplateInfo[] {
  const items: TemplateInfo[] = []
  for (const id of sourceById.keys()) {
    const template = getTemplate(id)
    if (template) items.push(infoFor(id, template))
  }
  for (const [id, template] of customTemplates) items.push(infoFor(id, template))
  return items.sort((left, right) => left.name.localeCompare(right.name))
}

export function getTemplate(id: string): Template | undefined {
  const custom = customTemplates.get(id)
  if (custom) return custom
  const cached = builtinCache.get(id)
  if (cached) return cached
  const source = sourceById.get(id)
  if (!source) return undefined
  const parsed = parseTemplate(source)
  if (!parsed.ok) return undefined
  builtinCache.set(id, parsed.template)
  return parsed.template
}

export function importTemplate(source: string): ParseResult<{ id: string; template: Template }> {
  const parsed = parseTemplate(source)
  if (!parsed.ok) return parsed
  const id = `custom-${slug(parsed.template.language)}`
  if (sourceById.has(id) || customTemplates.has(id)) {
    return { ok: false, error: `Template "${parsed.template.language}" sudah pernah diimpor.` }
  }
  customTemplates.set(id, parsed.template)
  return { ok: true, template: { id, template: parsed.template } }
}

export function removeCustomTemplate(id: string): void {
  customTemplates.delete(id)
}

export function resetCustomTemplates(): void {
  customTemplates.clear()
}
