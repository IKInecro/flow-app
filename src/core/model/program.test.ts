import { expect, test } from 'vitest'
import {
  appendStmt,
  createProgram,
  createStmt,
  findStmt,
  formatStmt,
  insertStmt,
  removeStmt,
  replaceStmt,
  stmtPathId,
  walkStmts,
} from './program'
import type { Program } from './types'

function seed(): Program {
  const withIf = appendStmt(createProgram('Test'), 'Main', {
    kind: 'if',
    condition: 'x > 0',
    then: [createStmt('output')],
    else: [],
  })
  return appendStmt(withIf, 'Main', createStmt('comment'))
}

test('createProgram has a single empty Main function', () => {
  const program = createProgram('Demo')
  expect(program.functions).toHaveLength(1)
  expect(program.functions[0]).toMatchObject({
    name: 'Main',
    returnType: 'None',
    returnVariable: '',
    body: [],
  })
  expect(program.meta.name).toBe('Demo')
})

test('appendStmt adds to the end of the function body', () => {
  const program = appendStmt(createProgram(), 'Main', createStmt('output'))
  expect(program.functions[0].body.map((stmt) => stmt.kind)).toEqual(['output'])
})

test('findStmt resolves nested then paths', () => {
  const program = seed()
  const found = findStmt(program, 'Main', '0/then/0')
  const ifStmt = program.functions[0].body[0]
  expect(found?.stmt.kind).toBe('output')
  expect(found?.parentBody).toBe(ifStmt.kind === 'if' ? ifStmt.then : null)
  expect(found?.index).toBe(0)
})

test('insertStmt into-then appends inside the if', () => {
  const program = seed()
  const next = insertStmt(program, 'Main', '0', 'into-then', createStmt('assign'))
  const ifStmt = next.functions[0].body[0]
  expect(ifStmt.kind).toBe('if')
  if (ifStmt.kind !== 'if') throw new Error('expected if')
  expect(ifStmt.then.map((stmt) => stmt.kind)).toEqual(['output', 'assign'])
})

test('insertStmt before and after keeps order', () => {
  const program = seed()
  const before = insertStmt(program, 'Main', '1', 'before', createStmt('input'))
  expect(before.functions[0].body.map((stmt) => stmt.kind)).toEqual(['if', 'input', 'comment'])
  const after = insertStmt(program, 'Main', '1', 'after', createStmt('breakpoint'))
  expect(after.functions[0].body.map((stmt) => stmt.kind)).toEqual(['if', 'comment', 'breakpoint'])
})

test('removeStmt keeps siblings', () => {
  const program = seed()
  const next = removeStmt(program, 'Main', '0/then/0')
  const ifStmt = next.functions[0].body[0]
  expect(ifStmt.kind).toBe('if')
  if (ifStmt.kind !== 'if') throw new Error('expected if')
  expect(ifStmt.then).toEqual([])
  expect(next.functions[0].body).toHaveLength(2)
})

test('replaceStmt swaps only the target', () => {
  const program = seed()
  const next = replaceStmt(program, 'Main', '1', createStmt('breakpoint'))
  expect(next.functions[0].body[1].kind).toBe('breakpoint')
  expect(program.functions[0].body[1].kind).toBe('comment')
})

test('operations never mutate the input program', () => {
  const program = seed()
  const snapshot = structuredClone(program)
  const next = insertStmt(program, 'Main', '0', 'into-else', createStmt('output'))
  expect(next).not.toBe(program)
  expect(program).toEqual(snapshot)
})

test('walkStmts visits paths in pre-order', () => {
  const program = seed()
  const visited: string[] = []
  walkStmts(program.functions[0].body, '', (stmt, path) => visited.push(`${stmt.kind}@${path}`))
  expect(visited).toEqual(['if@0', 'output@0/then/0', 'comment@1'])
})

test('stmtPathId joins function and path', () => {
  expect(stmtPathId('Main', '0/then/1')).toBe('Main:0/then/1')
})

test('formatStmt produces readable labels', () => {
  expect(formatStmt({ kind: 'output', expression: '"Hi"', newline: true })).toBe('Output "Hi"')
  expect(formatStmt({ kind: 'declare', names: ['a', 'b'], type: 'Integer', isArray: false, size: '' })).toBe('Integer a, b')
  expect(formatStmt({ kind: 'assign', target: { name: 'x' }, expression: 'x + 1' })).toBe('x ← x + 1')
})
