import { expect, test } from 'vitest'
import { parseTemplate, requiredSections } from './template'

const minimal = `
; a comment
# another comment
[Language]
name = Python
extension = py
[Program]
line = {main}
[Main]
line = {body}
[Output]
line = print({expression})
`

test('parses sections, comments, and metadata', () => {
  const result = parseTemplate(minimal)
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.template.language).toBe('Python')
  expect(result.template.extension).toBe('py')
  expect(result.template.sections.Output?.entries).toHaveLength(1)
  expect(result.template.sections.Output?.entries[0].value).toBe('print({expression})')
})

test('repeated keys accumulate as multiline entries', () => {
  const result = parseTemplate(
    minimal +
      `[Declare]
line = first {names}
line = second {names}
`,
  )
  expect(result.ok).toBe(true)
  if (!result.ok) return
  const entries = result.template.sections.Declare?.entries ?? []
  expect(entries.map((entry) => entry.value)).toEqual(['first {names}', 'second {names}'])
})

test('parses include and exclude flags on keys', () => {
  const result = parseTemplate(
    minimal +
      `[For]
line = plain
inc line = included
~step line = excluded
inc ~step line = both
indent =
dedent =
`,
  )
  expect(result.ok).toBe(true)
  if (!result.ok) return
  const entries = result.template.sections.For?.entries ?? []
  expect(entries[0].flags).toEqual({ include: [], exclude: [] })
  expect(entries[1].flags).toEqual({ include: ['inc'], exclude: [] })
  expect(entries[2].flags).toEqual({ include: [], exclude: ['step'] })
  expect(entries[3].flags).toEqual({ include: ['inc'], exclude: ['step'] })
  expect(entries[4].key).toBe('indent')
  expect(entries[5].key).toBe('dedent')
})

test('reports missing required sections by name', () => {
  const result = parseTemplate('[Language]\nname = Python\n[Program]\nline = {main}\n[Main]\nline = {body}\n')
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toContain('Output')
  expect(requiredSections).toContain('Output')
})

test('rejects key-value lines outside a section', () => {
  const result = parseTemplate('loose = line\n' + minimal)
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toMatch(/section/i)
})
