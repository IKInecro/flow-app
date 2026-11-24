import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'
import { appendStmt } from '../../../core/model/program'
import type { Stmt } from '../../../core/model/types'
import { createProjectRecord } from '../../../shared/storage/projects'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { Inspector } from './Inspector'

function loadWith(stmt: Stmt, path = '0'): void {
  const record = createProjectRecord('Inspector')
  record.program = appendStmt(record.program, 'Main', stmt)
  useProjectStore.getState().load(record)
  useUiStore.setState({ selectedFunction: 'Main', selectedPath: path })
}

const body = () => useProjectStore.getState().program?.functions[0].body ?? []

beforeEach(() => {
  useUiStore.setState({ selectedPath: null })
})

test('output exposes expression and newline and persists edits', async () => {
  loadWith({ kind: 'output', expression: '"hi"', newline: true })
  render(<Inspector />)

  const expression = screen.getByLabelText(/expression/i)
  expect(expression).toHaveValue('"hi"')

  await userEvent.clear(expression)
  await userEvent.type(expression, '"halo"{Enter}')

  expect(body()[0]).toMatchObject({ kind: 'output', expression: '"halo"' })

  await userEvent.click(screen.getByLabelText(/new line/i))
  expect(body()[0]).toMatchObject({ kind: 'output', newline: false })
})

test('assign edits target and rejects an empty target', async () => {
  loadWith({ kind: 'assign', target: { name: 'x' }, expression: '1' })
  const record = useProjectStore.getState().record
  if (!record) throw new Error('missing record')
  record.program = appendStmt(record.program, 'Main', {
    kind: 'declare',
    names: ['x'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  useProjectStore.getState().load(record)

  render(<Inspector />)
  const target = screen.getByLabelText(/target name/i)
  expect(target).toHaveValue('x')

  await userEvent.clear(target)
  await userEvent.tab()
  expect(screen.getByRole('alert')).toHaveTextContent(/required/i)
  expect(body()[0]).toMatchObject({ kind: 'assign', target: { name: 'x' } })
})

test('declare exposes type, array, and size', async () => {
  loadWith({ kind: 'declare', names: ['a'], type: 'Integer', isArray: false, size: '' })
  render(<Inspector />)

  expect(screen.getByLabelText(/^type$/i)).toHaveValue('Integer')
  expect(screen.getByLabelText(/array/i)).not.toBeChecked()
  expect(screen.queryByLabelText(/size/i)).not.toBeInTheDocument()

  await userEvent.click(screen.getByLabelText(/array/i))
  const size = screen.getByLabelText(/size/i)
  await userEvent.type(size, '5{Enter}')

  expect(body()[0]).toMatchObject({ kind: 'declare', isArray: true, size: '5' })
})

test('for exposes direction and all four counter fields', async () => {
  loadWith({
    kind: 'for',
    variable: 'i',
    start: '0',
    end: '3',
    step: '1',
    direction: 'inc',
    body: [],
  })
  render(<Inspector />)

  expect(screen.getByLabelText(/variable/i)).toHaveValue('i')
  expect(screen.getByLabelText(/^start$/i)).toHaveValue('0')
  expect(screen.getByLabelText(/^end$/i)).toHaveValue('3')
  expect(screen.getByLabelText(/^step$/i)).toHaveValue('1')
  await userEvent.selectOptions(screen.getByLabelText(/direction/i), 'dec')
  expect(body()[0]).toMatchObject({ kind: 'for', direction: 'dec' })
})

test('breakpoint exposes an optional condition', async () => {
  loadWith({ kind: 'breakpoint' })
  render(<Inspector />)

  const condition = screen.getByLabelText(/condition/i)
  await userEvent.type(condition, 'x > 0{Enter}')
  expect(body()[0]).toMatchObject({ kind: 'breakpoint', condition: 'x > 0' })
})

test('call shows a picker and warns on arity mismatch', async () => {
  const record = createProjectRecord('Call')
  record.program = appendStmt(record.program, 'Main', {
    kind: 'call',
    functionName: 'Add',
    args: ['1'],
  })
  record.program = {
    ...record.program,
    functions: [
      ...record.program.functions,
      {
        name: 'Add',
        returnType: 'Integer',
        returnVariable: '',
        params: [
          { name: 'a', type: 'Integer', isArray: false },
          { name: 'b', type: 'Integer', isArray: false },
        ],
        body: [],
      },
    ],
  }
  useProjectStore.getState().load(record)
  useUiStore.setState({ selectedPath: '0' })

  render(<Inspector />)
  expect(screen.getByLabelText(/function/i)).toHaveValue('Add')
  expect(screen.getAllByText(/expected 2 arguments/i).length).toBeGreaterThan(0)
})

test('turtle statements are read-only with a phase 2 notice', () => {
  loadWith({ kind: 'turtle', op: 'forward', fields: { distance: '10' } })
  render(<Inspector />)

  expect(screen.getAllByText(/phase 2/i).length).toBeGreaterThan(0)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

test('problems list reports undeclared variables', () => {
  loadWith({ kind: 'assign', target: { name: 'ghost' }, expression: '1' })
  render(<Inspector />)

  const problems = screen.getByLabelText(/problems/i)
  expect(problems).toHaveTextContent(/ghost/i)
})
