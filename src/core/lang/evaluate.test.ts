import { expect, test } from 'vitest'
import { parseExpression } from './parser'
import { evaluate } from './evaluate'
import { type ArrayValue, type EvalContext, type ScalarValue, scalar } from './values'

function context(overrides: Partial<EvalContext> = {}): EvalContext {
  const values = new Map<string, ScalarValue | ArrayValue>([
    ['x', scalar('Integer', 1)],
    ['a', { kind: 'array', elementType: 'Integer', items: [scalar('Integer', 7), scalar('Integer', 8)] }],
  ])
  return {
    lookup: (name) => values.get(name.toLowerCase()),
    callFunction: (_name, args) => {
      const first = args[0]
      if (!first || first.kind !== 'scalar') throw new Error('missing arg')
      return scalar('Integer', Number(first.value) * 2)
    },
    random: (max) => max - 1,
    ...overrides,
  }
}

function run(source: string, ctx: EvalContext = context()): ScalarValue {
  const parsed = parseExpression(source)
  if (!parsed.ok) throw new Error(parsed.error.message)
  return evaluate(parsed.expr, ctx)
}

test('division always produces a real', () => {
  expect(run('1 / 2')).toEqual(scalar('Real', 0.5))
})

test('mod stays integer', () => {
  expect(run('7 mod 3')).toEqual(scalar('Integer', 1))
})

test('concatenation converts values to text', () => {
  expect(run('"a" & 2')).toEqual(scalar('String', 'a2'))
})

test('plus rejects non-numbers', () => {
  expect(() => run('"2" + 1')).toThrow(/butuh angka/)
})

test('boolean keyword operators short-circuit', () => {
  expect(run('true and not false')).toEqual(scalar('Boolean', true))
  expect(run('false and 1 / 0 = 1')).toEqual(scalar('Boolean', false))
})

test('math intrinsics', () => {
  expect(run('Abs(-3)')).toEqual(scalar('Integer', 3))
  expect(run('Sqrt(9)')).toEqual(scalar('Real', 3))
  expect(run('Int(3.9)')).toEqual(scalar('Integer', 3))
})

test('Random uses the injected generator', () => {
  let seen = 0
  const ctx = context({
    random: (max) => {
      seen = max
      return max - 1
    },
  })
  expect(run('Random(5)', ctx)).toEqual(scalar('Integer', 4))
  expect(seen).toBe(5)
})

test('conversion intrinsics', () => {
  expect(run('ToInteger("12.9")')).toEqual(scalar('Integer', 12))
  expect(run('ToReal("1.5")')).toEqual(scalar('Real', 1.5))
  expect(run('ToString(12)')).toEqual(scalar('String', '12'))
})

test('char intrinsics are zero-based and bounds checked', () => {
  expect(run('Char("abc", 1)')).toEqual(scalar('String', 'b'))
  expect(run('ToCode("A")')).toEqual(scalar('Integer', 65))
  expect(run('ToChar(66)')).toEqual(scalar('String', 'B'))
  expect(() => run('Char("abc", 9)')).toThrow(/di luar/)
})

test('array indexing and Size', () => {
  expect(run('a[1]')).toEqual(scalar('Integer', 8))
  expect(run('Size(a)')).toEqual(scalar('Integer', 2))
  expect(() => run('a[5]')).toThrow(/di luar/)
})

test('user function calls go through the context', () => {
  expect(run('Double(21)')).toEqual(scalar('Integer', 42))
})

test('division by zero faults', () => {
  expect(() => run('1 / 0')).toThrow(/nol/)
})
