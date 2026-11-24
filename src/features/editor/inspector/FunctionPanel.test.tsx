import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { appendStmt } from '../../../core/model/program'
import { createProjectRecord } from '../../../shared/storage/projects'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { FunctionPanel } from './FunctionPanel'

function load(program = appendStmt(createProjectRecord('Fns').program, 'Main', {
  kind: 'call',
  functionName: 'Foo',
  args: [],
})) {
  const record = createProjectRecord('Fns')
  record.program = program
  if (!program.functions.some((fn) => fn.name === 'Foo')) {
    record.program = {
      ...record.program,
      functions: [
        ...record.program.functions,
        { name: 'Foo', returnType: 'None', returnVariable: '', params: [], body: [] },
      ],
    }
  }
  useProjectStore.getState().load(record)
  useUiStore.setState({ selectedFunction: 'Main', selectedPath: null })
  return record
}

test('renaming a function updates callsites', async () => {
  load()
  render(<FunctionPanel />)

  await userEvent.click(screen.getByRole('button', { name: /^foo$/i }))
  const name = screen.getByLabelText(/function name/i)
  await userEvent.clear(name)
  await userEvent.type(name, 'Bar{Enter}')

  const program = useProjectStore.getState().program
  expect(program?.functions.some((fn) => fn.name === 'Bar')).toBe(true)
  const main = program?.functions.find((fn) => fn.name === 'Main')
  expect(main?.body[0]).toMatchObject({ kind: 'call', functionName: 'Bar' })
})

test('Main cannot be deleted', () => {
  load()
  render(<FunctionPanel />)
  expect(screen.getByRole('button', { name: /delete function/i })).toBeDisabled()
})

test('duplicate function names are blocked', async () => {
  load()
  render(<FunctionPanel />)

  const newName = screen.getByLabelText(/new function/i)
  await userEvent.type(newName, 'Foo')
  await userEvent.click(screen.getByRole('button', { name: /add function/i }))

  expect(screen.getByRole('alert')).toHaveTextContent(/already taken/i)
  const program = useProjectStore.getState().program
  expect(program?.functions.filter((fn) => fn.name.toLowerCase() === 'foo')).toHaveLength(1)
})
