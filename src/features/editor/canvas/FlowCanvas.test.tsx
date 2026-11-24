import { render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { appendStmt } from '../../../core/model/program'
import { createProjectRecord } from '../../../shared/storage/projects'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { FlowCanvas } from './FlowCanvas'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  useUiStore.setState({ selectedFunction: 'Main', selectedPath: null })
})

test('renders start, statement, and end nodes for the selected function', () => {
  const record = createProjectRecord('Canvas')
  record.program = appendStmt(record.program, 'Main', {
    kind: 'output',
    expression: '"hi"',
    newline: true,
  })
  useProjectStore.getState().load(record)

  render(<FlowCanvas />)

  expect(screen.getByLabelText('Mulai')).toBeInTheDocument()
  expect(screen.getByText('Output "hi"')).toBeInTheDocument()
  expect(screen.getByLabelText('Selesai')).toBeInTheDocument()
})

test('marks nodes with validation errors', () => {
  const record = createProjectRecord('Bad')
  record.program = appendStmt(record.program, 'Main', {
    kind: 'assign',
    target: { name: 'ghost' },
    expression: '1',
  })
  useProjectStore.getState().load(record)

  render(<FlowCanvas />)

  expect(screen.getByLabelText('Error validasi')).toBeInTheDocument()
})
