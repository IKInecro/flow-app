import { fireEvent, render, waitFor } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'
import { appendStmt } from '../../core/model/program'
import { createProjectRecord } from '../../shared/storage/projects'
import { useRuntimeStore } from '../run/runtimeStore'
import { useProjectStore } from './store/projectStore'
import { useUiStore } from './store/uiStore'
import { isEditableTarget, useShortcuts } from './useShortcuts'

function Probe() {
  useShortcuts()
  return (
    <div>
      <input aria-label="field" />
    </div>
  )
}

beforeEach(() => {
  const record = createProjectRecord('Shortcuts')
  record.program = appendStmt(record.program, 'Main', {
    kind: 'output',
    expression: '"hai"',
    newline: true,
  })
  useProjectStore.getState().load(record)
  useUiStore.setState({
    commandOpen: false,
    selectedFunction: 'Main',
    selectedPath: null,
  })
  useRuntimeStore.setState({
    status: 'idle',
    activePath: null,
    entries: [],
    variables: [],
    callStack: [],
    pendingInput: undefined,
    error: undefined,
  })
})

test('recognises editable targets', () => {
  expect(isEditableTarget(document.createElement('input'))).toBe(true)
  expect(isEditableTarget(document.createElement('select'))).toBe(true)
  expect(isEditableTarget(document.createElement('div'))).toBe(false)
})

test('F5 runs the program', async () => {
  render(<Probe />)
  fireEvent.keyDown(window, { key: 'F5' })

  await waitFor(() => expect(useRuntimeStore.getState().status).toBe('done'))
})

test('ignores shortcuts while a field is focused', async () => {
  render(<Probe />)
  const field = document.querySelector('input')
  if (!field) throw new Error('missing field')
  field.focus()
  fireEvent.keyDown(field, { key: 'F5' })

  await new Promise((resolve) => setTimeout(resolve, 25))
  expect(useRuntimeStore.getState().status).toBe('idle')
})

test('Ctrl+K opens the command palette', () => {
  render(<Probe />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  expect(useUiStore.getState().commandOpen).toBe(true)
})

test('Delete removes the selected statement', () => {
  useUiStore.setState({ selectedPath: '0' })
  render(<Probe />)
  fireEvent.keyDown(window, { key: 'Delete' })

  expect(useProjectStore.getState().program?.functions[0].body).toHaveLength(0)
  expect(useUiStore.getState().selectedPath).toBeNull()
})
