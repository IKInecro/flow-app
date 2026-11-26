import { expect, test } from 'vitest'
import { appendStmt, createProgram } from '../../core/model/program'
import type { Program } from '../../core/model/types'
import { createRunController, type RuntimeState } from './controller'

function hello(): Program {
  return appendStmt(createProgram('Run'), 'Main', {
    kind: 'output',
    expression: '"Hello"',
    newline: true,
  })
}

function threeOutputs(): Program {
  let program = createProgram('Steps')
  for (const text of ['"a"', '"b"', '"c"']) {
    program = appendStmt(program, 'Main', { kind: 'output', expression: text, newline: true })
  }
  return program
}

function inputProgram(): Program {
  let program = createProgram('Input')
  program = appendStmt(program, 'Main', {
    kind: 'declare',
    names: ['n'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  program = appendStmt(program, 'Main', { kind: 'input', variable: { name: 'n' } })
  program = appendStmt(program, 'Main', { kind: 'output', expression: 'n', newline: true })
  return program
}

function outputTexts(state: RuntimeState): string[] {
  return state.entries.filter((entry) => entry.kind === 'output').map((entry) => entry.text)
}

test('start runs to done and appends output entries', async () => {
  const controller = createRunController(() => undefined)
  await controller.start(hello())

  const state = controller.getState()
  expect(state.status).toBe('done')
  expect(outputTexts(state)).toEqual(['Hello'])
})

test('step advances exactly one nodeEnter', async () => {
  const controller = createRunController(() => undefined)
  const program = threeOutputs()

  await controller.step(program)
  expect(controller.getState().status).toBe('paused')
  expect(controller.getState().activePath).toBe('0')

  await controller.step(program)
  expect(controller.getState().activePath).toBe('1')

  await controller.step(program)
  expect(controller.getState().activePath).toBe('2')
})

test('pause halts the run loop and resume finishes it', async () => {
  const controller = createRunController(() => undefined)
  const pending = controller.start(threeOutputs())
  controller.pause()
  await pending

  expect(controller.getState().status).toBe('paused')
  expect(outputTexts(controller.getState()).length).toBeLessThan(3)

  await controller.resume()
  expect(controller.getState().status).toBe('done')
  expect(outputTexts(controller.getState())).toEqual(['a', 'b', 'c'])
})

test('breakpoints pause until resumed or ignored', async () => {
  let program = createProgram('Break')
  program = appendStmt(program, 'Main', { kind: 'output', expression: '"before"', newline: true })
  program = appendStmt(program, 'Main', { kind: 'breakpoint' })
  program = appendStmt(program, 'Main', { kind: 'output', expression: '"after"', newline: true })

  const controller = createRunController(() => undefined)
  await controller.start(program)
  expect(controller.getState().status).toBe('paused')
  expect(controller.getState().activePath).toBe('1')

  await controller.resume()
  expect(controller.getState().status).toBe('done')
  expect(outputTexts(controller.getState())).toEqual(['before', 'after'])

  const skipped = createRunController(() => undefined)
  await skipped.start(program, { ignoreBreakpoints: true })
  expect(skipped.getState().status).toBe('done')
})

test('submitInput rejects bad input and then accepts the right type', async () => {
  const controller = createRunController(() => undefined)
  await controller.start(inputProgram())
  expect(controller.getState().status).toBe('awaiting-input')

  await controller.submitInput('abc')
  expect(controller.getState().status).toBe('awaiting-input')
  expect(
    controller.getState().entries.some(
      (entry) => entry.kind === 'error' && /not a valid Integer/i.test(entry.text),
    ),
  ).toBe(true)

  await controller.submitInput('42')
  expect(controller.getState().status).toBe('done')
  expect(
    controller.getState().entries.some((entry) => entry.kind === 'input' && entry.text === '42'),
  ).toBe(true)
  expect(outputTexts(controller.getState())).toEqual(['42'])
})

test('runtime errors set status and keep the node path', async () => {
  const program = appendStmt(createProgram('Error'), 'Main', {
    kind: 'output',
    expression: '1 / 0',
    newline: true,
  })
  const controller = createRunController(() => undefined)
  await controller.start(program)

  const state = controller.getState()
  expect(state.status).toBe('error')
  expect(state.error?.path).toBe('0')
  expect(state.entries.some((entry) => entry.kind === 'error' && entry.path === '0')).toBe(true)
})

test('stop returns to idle without leaving the generator open', async () => {
  const controller = createRunController(() => undefined)
  await controller.start(inputProgram())
  expect(controller.getState().status).toBe('awaiting-input')

  controller.stop()
  expect(controller.getState().status).toBe('idle')
  expect(controller.getState().activePath).toBeNull()

  await controller.resume()
  expect(controller.getState().status).toBe('idle')
})

test('reset clears the console, variables, and waiting input', async () => {
  const controller = createRunController(() => undefined)
  await controller.start(inputProgram())
  expect(controller.getState().status).toBe('awaiting-input')

  controller.reset()

  const state = controller.getState()
  expect(state.status).toBe('idle')
  expect(state.entries).toEqual([])
  expect(state.variables).toEqual([])
  expect(state.callStack).toEqual([])
  expect(state.activePath).toBeNull()
  expect(state.pendingInput).toBeUndefined()
  expect(state.error).toBeUndefined()
})

test('reset after an error lets the next run start clean', async () => {
  const broken = appendStmt(createProgram('Error'), 'Main', {
    kind: 'output',
    expression: '1 / 0',
    newline: true,
  })
  const controller = createRunController(() => undefined)
  await controller.start(broken)
  expect(controller.getState().status).toBe('error')

  controller.reset()
  await controller.start(hello())

  expect(controller.getState().status).toBe('done')
  expect(outputTexts(controller.getState())).toEqual(['Hello'])
})
