import { expect, test } from 'vitest'
import { appendStmt, createProgram, createStmt } from '../model/program'
import type { FunctionDef, Program, Stmt } from '../model/types'
import { checkProgram } from './validate'

function make(body: Stmt[], functions: FunctionDef[] = []): Program {
  let program = createProgram('Validation')
  for (const stmt of body) program = appendStmt(program, 'Main', stmt)
  return { ...program, functions: [...program.functions, ...functions] }
}

function fn(name: string, params: FunctionDef['params'], returnType: FunctionDef['returnType'] = 'None'): FunctionDef {
  return { name, returnType, returnVariable: '', params, body: [] }
}

test('flags an undeclared variable with its location', () => {
  const program = make([{ kind: 'assign', target: { name: 'x' }, expression: '1' }])
  const diagnostics = checkProgram(program)
  expect(diagnostics).toContainEqual(
    expect.objectContaining({ severity: 'error', path: '0', function: 'Main' }),
  )
  expect(diagnostics.some((item) => item.message.includes('x'))).toBe(true)
})

test('flags a misspelled function', () => {
  const program = make([{ kind: 'output', expression: 'Fooo(1)', newline: true }])
  const diagnostics = checkProgram(program)
  expect(diagnostics.some((item) => item.message.includes('Fooo'))).toBe(true)
})

test('flags wrong argument count', () => {
  const program = make(
    [{ kind: 'output', expression: 'Add(1)', newline: true }],
    [fn('Add', [{ name: 'a', type: 'Integer', isArray: false }, { name: 'b', type: 'Integer', isArray: false }], 'Integer')],
  )
  const diagnostics = checkProgram(program)
  expect(diagnostics.some((item) => /argumen/i.test(item.message))).toBe(true)
})

test('allows implicit real to integer conversion without diagnostics', () => {
  const program = make([
    { kind: 'declare', names: ['n'], type: 'Integer', isArray: false, size: '' },
    { kind: 'assign', target: { name: 'n' }, expression: '3.7' },
    { kind: 'output', expression: 'n', newline: true },
  ])
  expect(checkProgram(program)).toEqual([])
})

test('flags a None function used in an expression', () => {
  const program = make([{ kind: 'output', expression: 'DoThing()', newline: true }], [fn('DoThing', [])])
  const diagnostics = checkProgram(program)
  expect(diagnostics.some((item) => /tidak mengembalikan|None/i.test(item.message))).toBe(true)
})

test('flags arrays without a size', () => {
  const program = make([{ kind: 'declare', names: ['a'], type: 'Integer', isArray: true, size: '' }])
  const diagnostics = checkProgram(program)
  expect(diagnostics.some((item) => /ukuran/i.test(item.message))).toBe(true)
})

test('accepts a valid loop program', () => {
  const program = make([
    { kind: 'declare', names: ['n'], type: 'Integer', isArray: false, size: '' },
    { kind: 'assign', target: { name: 'n' }, expression: '1' },
    createStmt('while'),
    { kind: 'output', expression: 'n', newline: true },
  ])
  const loop = program.functions[0].body[2]
  expect(loop.kind).toBe('while')
  if (loop.kind !== 'while') return
  loop.condition = 'n < 3'
  loop.body.push({ kind: 'assign', target: { name: 'n' }, expression: 'n + 1' })
  expect(checkProgram(program)).toEqual([])
})

test('flags a non-integer for-loop variable', () => {
  const program = make([
    { kind: 'declare', names: ['s'], type: 'String', isArray: false, size: '' },
    { kind: 'for', variable: 's', start: '0', end: '2', step: '1', direction: 'inc', body: [] },
  ])
  const diagnostics = checkProgram(program)
  expect(diagnostics.some((item) => /Integer/i.test(item.message))).toBe(true)
})
