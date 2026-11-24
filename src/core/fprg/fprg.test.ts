import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parseFprg } from './parse'
import { escAttr, serializeFprg } from './serialize'

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}.fprg`, 'utf8')

test('parses a v2 factorial program', () => {
  const result = parseFprg(fixture('v2-factorial'))
  expect(result.ok).toBe(true)
  if (!result.ok) return
  const body = result.program.functions[0].body
  expect(body.map((stmt) => stmt.kind)).toEqual(['declare', 'assign', 'output', 'if'])
  expect(result.program.meta.name).toBe('Factorial')
  expect(result.program.fileVersion).toBe('2.11')
  const ifStmt = body[3]
  expect(ifStmt.kind).toBe('if')
  if (ifStmt.kind !== 'if') return
  expect(ifStmt.condition).toBe('n > 0')
  expect(ifStmt.then).toHaveLength(1)
  expect(ifStmt.else).toEqual([])
})

test('keeps array declarations and accepts 1.0 variables attribute', () => {
  const result = parseFprg(fixture('v4-arrays'))
  expect(result.ok).toBe(true)
  if (!result.ok) return
  const declare = result.program.functions[0].body[0]
  expect(declare).toMatchObject({ kind: 'declare', names: ['a'], isArray: true, size: '5' })

  const legacy = parseFprg(
    '<flowgorithm fileversion="1.0"><function name="Main" type="None" variable=""><body>' +
      '<declare variables="x, y" type="Integer"/></body></function></flowgorithm>',
  )
  expect(legacy.ok).toBe(true)
  if (!legacy.ok) return
  expect(legacy.program.functions[0].body[0]).toMatchObject({
    kind: 'declare',
    names: ['x', 'y'],
    isArray: false,
  })
})

test('preserves unknown elements and re-emits them', () => {
  const result = parseFprg(fixture('v4-unknown'))
  expect(result.ok).toBe(true)
  if (!result.ok) return
  const unknown = result.program.functions[0].body[1]
  expect(unknown.kind).toBe('unsupported')
  expect(result.program.unknown).toHaveLength(1)
  const xml = serializeFprg(result.program)
  expect(xml).toContain('<customNode foo="bar"/>')
  expect(xml).toContain('<extra note="keep"/>')
})

test('returns an error for malformed XML', () => {
  const result = parseFprg('<flowgorithm><function>')
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error.length).toBeGreaterThan(0)
})

test('round-trips a 4.2 program and writes the current file version', () => {
  const first = parseFprg(fixture('v4-arrays'))
  expect(first.ok).toBe(true)
  if (!first.ok) return
  const xml = serializeFprg(first.program)
  expect(xml).toContain('<flowgorithm fileversion="4.2">')
  const second = parseFprg(xml)
  expect(second.ok).toBe(true)
  if (!second.ok) return
  expect(second.program.functions).toEqual(first.program.functions)
  expect(second.program.meta).toEqual(first.program.meta)
})

test('escapes reserved and non-ASCII characters in attributes', () => {
  expect(escAttr('a & b < c > "d"')).toBe('a &amp; b &lt; c &gt; &quot;d&quot;')
  expect(escAttr('café')).toBe('caf&#233;')
  const program = parseFprg(fixture('v2-factorial'))
  expect(program.ok).toBe(true)
  if (!program.ok) return
  program.program.meta.about = 'a & b < c'
  const xml = serializeFprg(program.program)
  expect(xml).toContain('value="a &amp; b &lt; c"')
})
