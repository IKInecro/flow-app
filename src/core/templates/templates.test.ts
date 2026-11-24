import { beforeEach, expect, test } from 'vitest'
import { parseTemplate } from '../codegen/template'
import {
  getTemplate,
  importTemplate,
  listTemplates,
  resetCustomTemplates,
} from './index'

const CORE_IDS = [
  'ada95',
  'applescript',
  'autohotkey',
  'bash',
  'csharp',
  'cpp',
  'fortran2003',
  'groovy',
  'java',
  'javascript',
  'kotlin',
  'lua',
  'matlab',
  'nim',
  'pascal',
  'perl',
  'php',
  'powershell',
  'python',
  'qbasic',
  'ruby',
  'scala',
  'smalltalk',
  'swift',
  'tsql',
  'typescript',
  'vbnet',
]

const EXTRA_IDS = ['vba', 'pseudo-auto', 'pseudo-gaddis', 'pseudo-ibo']

function sourceOf(id: string): string {
  const template = getTemplate(id)
  if (!template) throw new Error(`missing template ${id}`)
  return template.source
}

beforeEach(() => {
  resetCustomTemplates()
})

test('registry exposes exactly the built-in language and pseudocode ids', () => {
  const ids = listTemplates()
    .map((item) => item.id)
    .filter((id) => !id.startsWith('custom-'))
  expect(new Set(ids)).toEqual(new Set([...CORE_IDS, ...EXTRA_IDS]))
  expect(ids).toHaveLength(CORE_IDS.length + EXTRA_IDS.length)
})

test('every template parses and defines the required sections', () => {
  for (const item of listTemplates()) {
    const source = sourceOf(item.id)
    const parsed = parseTemplate(source)
    expect(parsed.ok, `${item.id}: ${parsed.ok ? '' : parsed.error}`).toBe(true)
    if (!parsed.ok) continue
    for (const section of ['Language', 'Types', 'Assign', 'Output', 'If', 'While', 'For']) {
      expect(parsed.template.sections[section], `${item.id} missing [${section}]`).toBeDefined()
    }
    expect(parsed.template.language.length, `${item.id} language name`).toBeGreaterThan(0)
    expect(parsed.template.extension.length, `${item.id} extension`).toBeGreaterThan(0)
  }
})

test('pseudocode templates are tagged as pseudocode', () => {
  const info = new Map(listTemplates().map((item) => [item.id, item]))
  expect(info.get('pseudo-gaddis')?.kind).toBe('pseudocode')
  expect(info.get('python')?.kind).toBe('language')
  expect(info.get('python')?.name).toBe('Python')
  expect(info.get('python')?.extension).toBe('py')
})

test('getTemplate parses lazily and caches the result', () => {
  const first = getTemplate('python')
  const second = getTemplate('python')
  expect(first).toBeDefined()
  expect(second).toBe(first)
  expect(getTemplate('nope')).toBeUndefined()
})

test('importTemplate registers a custom template and rejects duplicates', () => {
  const source = sourceOf('python').replace('name = Python', 'name = My Python')
  const first = importTemplate(source)
  expect(first.ok).toBe(true)
  if (!first.ok) return
  expect(first.template.id).toBe('custom-my-python')
  expect(getTemplate(first.template.id)).toBe(first.template.template)
  expect(listTemplates().some((item) => item.id === 'custom-my-python')).toBe(true)

  const duplicate = importTemplate(source)
  expect(duplicate.ok).toBe(false)
  if (duplicate.ok) return
  expect(duplicate.error).toMatch(/already/i)
})

test('importTemplate surfaces missing required sections', () => {
  const broken = sourceOf('python').replace('[Output]', '[NotOutput]')
  const result = importTemplate(broken)
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toContain('Output')
})
