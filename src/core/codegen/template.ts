export interface EntryFlags {
  include: string[]
  exclude: string[]
}

export interface TemplateEntry {
  key: string
  value: string
  flags: EntryFlags
  line: number
}

export interface TemplateSection {
  entries: TemplateEntry[]
}

export interface Template {
  source: string
  language: string
  extension: string
  sections: Record<string, TemplateSection>
}

export type ParseResult<T> =
  | { ok: true; template: T }
  | { ok: false; error: string }

export type TemplateParseResult = ParseResult<Template>

export const requiredSections: string[] = ['Language', 'Program', 'Main', 'Output']

function parseKey(raw: string): { key: string; flags: EntryFlags } {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  const key = tokens.pop() ?? ''
  const include: string[] = []
  const exclude: string[] = []
  for (const token of tokens) {
    if (token.startsWith('~')) exclude.push(token.slice(1))
    else include.push(token)
  }
  return { key, flags: { include, exclude } }
}

export function parseTemplate(source: string): TemplateParseResult {
  const sections: Record<string, TemplateSection> = {}
  let current: TemplateSection | null = null

  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (trimmed.startsWith(';') || trimmed.startsWith('#')) continue

    if (trimmed.startsWith('[')) {
      if (!trimmed.endsWith(']')) {
        return { ok: false, error: `Section tidak valid di baris ${index + 1}: ${trimmed}` }
      }
      const name = trimmed.slice(1, -1).trim()
      if (!name) return { ok: false, error: `Nama section kosong di baris ${index + 1}.` }
      current = { entries: [] }
      sections[name] = current
      continue
    }

    const bareTokens = trimmed.split(/\s+/)
    const bareKey = bareTokens[bareTokens.length - 1]
    if ((bareKey === 'indent' || bareKey === 'dedent') && !trimmed.includes('=')) {
      if (!current) {
        return { ok: false, error: `Baris ${index + 1} berada di luar section.` }
      }
      const parsedBare = parseKey(trimmed)
      current.entries.push({
        key: parsedBare.key,
        value: '',
        flags: parsedBare.flags,
        line: index + 1,
      })
      continue
    }

    const separator = raw.indexOf('=')
    if (separator === -1) {
      return { ok: false, error: `Baris ${index + 1} bukan key = value.` }
    }
    if (!current) {
      return { ok: false, error: `Baris ${index + 1} berada di luar section.` }
    }
    const { key, flags } = parseKey(raw.slice(0, separator))
    if (!key) return { ok: false, error: `Key kosong di baris ${index + 1}.` }
    current.entries.push({
      key,
      value: raw.slice(separator + 1).trim(),
      flags,
      line: index + 1,
    })
  }

  for (const section of requiredSections) {
    if (!sections[section]) {
      return { ok: false, error: `Section "${section}" tidak ditemukan.` }
    }
  }

  return {
    ok: true,
    template: {
      source,
      language: sectionValue(sections, 'Language', 'name') ?? '',
      extension: sectionValue(sections, 'Language', 'extension') ?? '',
      sections,
    },
  }
}

export function sectionValue(
  sections: Record<string, TemplateSection>,
  section: string,
  key: string,
): string | undefined {
  const entries = sections[section]?.entries ?? []
  let found: string | undefined
  for (const entry of entries) {
    if (entry.key === key && entry.flags.include.length === 0 && entry.flags.exclude.length === 0) {
      found = entry.value
    }
  }
  return found
}
