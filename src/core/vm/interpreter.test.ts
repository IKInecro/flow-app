import { expect, test } from 'vitest'
import { appendStmt, createProgram } from '../model/program'
import type { FunctionDef, Program } from '../model/types'
import type { RuntimeEvent } from './events'
import { createInterpreter } from './interpreter'

function withFunction(program: Program, fn: FunctionDef): Program {
  return { ...program, functions: [...program.functions, fn] }
}

async function collect(
  program: Program,
  inputs: string[] = [],
  options: { ignoreBreakpoints?: boolean; maxDepth?: number } = {},
): Promise<RuntimeEvent[]> {
  const generator = createInterpreter(program, options)
  const queue = [...inputs]
  const events: RuntimeEvent[] = []
  let nextInput = ''
  for (;;) {
    const step = await generator.next(nextInput)
    nextInput = ''
    if (step.done) break
    events.push(step.value)
    if (step.value.type === 'inputRequest') {
      nextInput = queue.shift() ?? ''
    }
  }
  return events
}

const outputTexts = (events: RuntimeEvent[]) =>
  events.flatMap((event) => (event.type === 'output' ? [event.text] : []))

test('hello world', async () => {
  const program = appendStmt(createProgram(), 'Main', {
    kind: 'output',
    expression: '"Hello, world"',
    newline: true,
  })
  const events = await collect(program)
  expect(outputTexts(events)).toEqual(['Hello, world'])
  expect(events[0]).toEqual({ type: 'start', function: 'Main' })
  expect(events.at(-1)).toEqual({ type: 'done' })
})

test('if chooses the correct branch', async () => {
  const program = appendStmt(createProgram(), 'Main', {
    kind: 'if',
    condition: '1 < 2',
    then: [{ kind: 'output', expression: '"then"', newline: true }],
    else: [{ kind: 'output', expression: '"else"', newline: true }],
  })
  expect(outputTexts(await collect(program))).toEqual(['then'])
})

test('while and do loops run the expected number of times', async () => {
  let program = createProgram()
  program = appendStmt(program, 'Main', {
    kind: 'declare',
    names: ['n'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  program = appendStmt(program, 'Main', { kind: 'assign', target: { name: 'n' }, expression: '0' })
  program = appendStmt(program, 'Main', {
    kind: 'while',
    condition: 'n < 3',
    body: [
      { kind: 'output', expression: 'n', newline: true },
      { kind: 'assign', target: { name: 'n' }, expression: 'n + 1' },
    ],
  })
  expect(outputTexts(await collect(program))).toEqual(['0', '1', '2'])

  let doProgram = createProgram()
  doProgram = appendStmt(doProgram, 'Main', {
    kind: 'declare',
    names: ['n'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  doProgram = appendStmt(doProgram, 'Main', { kind: 'assign', target: { name: 'n' }, expression: '0' })
  doProgram = appendStmt(doProgram, 'Main', {
    kind: 'do',
    condition: 'n < 3',
    body: [
      { kind: 'output', expression: 'n', newline: true },
      { kind: 'assign', target: { name: 'n' }, expression: 'n + 1' },
    ],
  })
  expect(outputTexts(await collect(doProgram))).toEqual(['0', '1', '2'])
})

test('for loops are inclusive and support dec', async () => {
  let program = createProgram()
  program = appendStmt(program, 'Main', {
    kind: 'declare',
    names: ['i'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  program = appendStmt(program, 'Main', {
    kind: 'for',
    variable: 'i',
    start: '0',
    end: '2',
    step: '1',
    direction: 'inc',
    body: [{ kind: 'output', expression: 'i', newline: true }],
  })
  expect(outputTexts(await collect(program))).toEqual(['0', '1', '2'])

  let down = createProgram()
  down = appendStmt(down, 'Main', {
    kind: 'declare',
    names: ['i'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  down = appendStmt(down, 'Main', {
    kind: 'for',
    variable: 'i',
    start: '2',
    end: '0',
    step: '1',
    direction: 'dec',
    body: [{ kind: 'output', expression: 'i', newline: true }],
  })
  expect(outputTexts(await collect(down))).toEqual(['2', '1', '0'])
})

test('function call returns its return variable', async () => {
  const square: FunctionDef = {
    name: 'Square',
    returnType: 'Integer',
    returnVariable: 'r',
    params: [{ name: 'n', type: 'Integer', isArray: false }],
    body: [
      { kind: 'declare', names: ['r'], type: 'Integer', isArray: false, size: '' },
      { kind: 'assign', target: { name: 'r' }, expression: 'n * n' },
    ],
  }
  const program = withFunction(
    appendStmt(createProgram(), 'Main', {
      kind: 'output',
      expression: 'Square(4)',
      newline: true,
    }),
    square,
  )
  const events = await collect(program)
  expect(outputTexts(events)).toEqual(['16'])
  expect(events.some((event) => event.type === 'callEnter' && event.function === 'Square')).toBe(true)
  expect(events.some((event) => event.type === 'callExit' && event.function === 'Square')).toBe(true)
})

test('recursion computes factorial', async () => {
  const factorial: FunctionDef = {
    name: 'Factorial',
    returnType: 'Integer',
    returnVariable: 'result',
    params: [{ name: 'n', type: 'Integer', isArray: false }],
    body: [
      { kind: 'declare', names: ['result'], type: 'Integer', isArray: false, size: '' },
      {
        kind: 'if',
        condition: 'n <= 1',
        then: [{ kind: 'assign', target: { name: 'result' }, expression: '1' }],
        else: [
          {
            kind: 'assign',
            target: { name: 'result' },
            expression: 'n * Factorial(n - 1)',
          },
        ],
      },
    ],
  }
  const program = withFunction(
    appendStmt(createProgram(), 'Main', {
      kind: 'output',
      expression: 'Factorial(5)',
      newline: true,
    }),
    factorial,
  )
  expect(outputTexts(await collect(program))).toEqual(['120'])
})

test('array assignment and read', async () => {
  let program = createProgram()
  program = appendStmt(program, 'Main', {
    kind: 'declare',
    names: ['a'],
    type: 'Integer',
    isArray: true,
    size: '3',
  })
  program = appendStmt(program, 'Main', {
    kind: 'assign',
    target: { name: 'a', index: '1' },
    expression: '7',
  })
  program = appendStmt(program, 'Main', {
    kind: 'output',
    expression: 'a[1]',
    newline: true,
  })
  expect(outputTexts(await collect(program))).toEqual(['7'])
})

test('breakpoints fire unless ignored', async () => {
  let program = createProgram()
  program = appendStmt(program, 'Main', { kind: 'breakpoint' })
  program = appendStmt(program, 'Main', { kind: 'output', expression: '"x"', newline: true })

  const hit = await collect(program)
  expect(hit.some((event) => event.type === 'breakpoint')).toBe(true)

  const ignored = await collect(program, [], { ignoreBreakpoints: true })
  expect(ignored.some((event) => event.type === 'breakpoint')).toBe(false)
})

test('invalid integer input re-prompts without ending the run', async () => {
  let program = createProgram()
  program = appendStmt(program, 'Main', {
    kind: 'declare',
    names: ['n'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  program = appendStmt(program, 'Main', { kind: 'input', variable: { name: 'n' } })
  program = appendStmt(program, 'Main', { kind: 'output', expression: 'n', newline: true })

  const events = await collect(program, ['abc', '42'])
  const requests = events.filter((event) => event.type === 'inputRequest')
  expect(requests).toHaveLength(2)
  expect(events.some((event) => event.type === 'inputError')).toBe(true)
  const firstRequest = events.findIndex((event) => event.type === 'inputRequest')
  const secondRequest = events.findIndex(
    (event, index) => index > firstRequest && event.type === 'inputRequest',
  )
  expect(events.slice(firstRequest, secondRequest).some((event) => event.type === 'done')).toBe(false)
  expect(outputTexts(events)).toEqual(['42'])
})

test('divide by zero yields an error', async () => {
  const program = appendStmt(createProgram(), 'Main', {
    kind: 'output',
    expression: '1 / 0',
    newline: true,
  })
  const events = await collect(program)
  const error = events.find((event) => event.type === 'error')
  expect(error).toMatchObject({ type: 'error', error: { path: '0', function: 'Main' } })
})

test('runaway recursion stops at maxDepth', async () => {
  const loop: FunctionDef = {
    name: 'Loop',
    returnType: 'None',
    returnVariable: '',
    params: [],
    body: [{ kind: 'call', functionName: 'Loop', args: [] }],
  }
  const program = withFunction(
    appendStmt(createProgram(), 'Main', { kind: 'call', functionName: 'Loop', args: [] }),
    loop,
  )
  const events = await collect(program, [], { maxDepth: 5 })
  const error = events.find((event) => event.type === 'error')
  expect(error).toMatchObject({ type: 'error' })
  expect(error && error.type === 'error' ? error.error.message : '').toMatch(/rekursi|depth/i)
})

test('consumer stop closes the generator cleanly', async () => {
  const program = appendStmt(createProgram(), 'Main', { kind: 'breakpoint' })
  const generator = createInterpreter(program)
  await generator.next()
  await expect(generator.return()).resolves.toBeDefined()
})

test('snapshots expose declared variables', async () => {
  const program = appendStmt(createProgram(), 'Main', {
    kind: 'declare',
    names: ['n'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  const events = await collect(program)
  const snapshot = events.find((event) => event.type === 'snapshot')
  expect(snapshot).toBeDefined()
  if (!snapshot || snapshot.type !== 'snapshot') return
  expect(snapshot.frames[0].functionName).toBe('Main')
  expect(snapshot.frames[0].variables[0]).toMatchObject({ name: 'n', type: 'Integer', value: '0' })
})
