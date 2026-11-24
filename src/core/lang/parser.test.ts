import { expect, test } from 'vitest'
import { canonicalOp, type Expr } from './ast'
import { parseExpression } from './parser'

function ok(source: string): Expr {
  const result = parseExpression(source)
  if (!result.ok) throw new Error(`parse failed: ${result.error.message} @${result.error.position}`)
  return result.expr
}

test('multiplication binds tighter than addition', () => {
  expect(ok('1 + 2 * 3')).toEqual({
    kind: 'binary',
    op: '+',
    left: { kind: 'number', value: 1, isInt: true },
    right: {
      kind: 'binary',
      op: '*',
      left: { kind: 'number', value: 2, isInt: true },
      right: { kind: 'number', value: 3, isInt: true },
    },
  })
})

test('exponent is right-associative', () => {
  const expr = ok('2 ^ 3 ^ 2')
  expect(expr.kind).toBe('binary')
  if (expr.kind !== 'binary') return
  expect(expr.op).toBe('^')
  expect(expr.right).toMatchObject({ kind: 'binary', op: '^' })
})

test('unary minus binds tighter than exponent', () => {
  const expr = ok('-2 ^ 2')
  expect(expr.kind).toBe('binary')
  if (expr.kind !== 'binary') return
  expect(expr.left).toMatchObject({ kind: 'unary', op: '-' })
})

test('parentheses override precedence', () => {
  expect(ok('(1 + 2) * 3')).toMatchObject({
    kind: 'binary',
    op: '*',
    left: { kind: 'binary', op: '+' },
  })
})

test('unicode operators canonicalize to ASCII forms', () => {
  const expr = ok('a ≥ b ∧ c ≠ d')
  expect(expr).toMatchObject({
    kind: 'binary',
    op: 'and',
    left: { kind: 'binary', op: '>=' },
    right: { kind: 'binary', op: '!=' },
  })
  expect(ok('6 ÷ 2')).toMatchObject({ kind: 'binary', op: '/' })
  expect(canonicalOp('≥')).toBe('>=')
  expect(canonicalOp('×')).toBe('*')
})

test('keywords are case-insensitive', () => {
  expect(ok('True AND NoT False')).toEqual({
    kind: 'binary',
    op: 'and',
    left: { kind: 'boolean', value: true },
    right: { kind: 'unary', op: 'not', operand: { kind: 'boolean', value: false } },
  })
  expect(ok('PI')).toMatchObject({ kind: 'number', value: Math.PI, isInt: false })
})

test('strings support escaped quotes and backslashes', () => {
  expect(ok('"a\\"b"')).toEqual({ kind: 'string', value: 'a"b' })
  expect(ok('"c:\\\\tmp"')).toEqual({ kind: 'string', value: 'c:\\tmp' })
})

test('function calls with zero and many arguments', () => {
  expect(ok('Now()')).toEqual({ kind: 'call', name: 'Now', args: [] })
  expect(ok('Foo(1, 2 + 3, "x")')).toMatchObject({
    kind: 'call',
    name: 'Foo',
    args: [
      { kind: 'number', value: 1 },
      { kind: 'binary', op: '+' },
      { kind: 'string', value: 'x' },
    ],
  })
})

test('array indexing accepts any expression', () => {
  expect(ok('a[i + 1]')).toEqual({
    kind: 'index',
    name: 'a',
    index: {
      kind: 'binary',
      op: '+',
      left: { kind: 'identifier', name: 'i' },
      right: { kind: 'number', value: 1, isInt: true },
    },
  })
})

test('concatenation and equality aliases', () => {
  expect(ok('"a" & 2')).toMatchObject({ kind: 'binary', op: '&' })
  expect(ok('a = b')).toMatchObject({ kind: 'binary', op: '==' })
  expect(ok('a <> b')).toMatchObject({ kind: 'binary', op: '!=' })
})

test('errors report a position', () => {
  const unclosed = parseExpression('"abc')
  expect(unclosed.ok).toBe(false)
  if (unclosed.ok) return
  expect(unclosed.error.position).toBe(0)

  const trailing = parseExpression('1 +')
  expect(trailing.ok).toBe(false)
  if (trailing.ok) return
  expect(typeof trailing.error.position).toBe('number')
})
