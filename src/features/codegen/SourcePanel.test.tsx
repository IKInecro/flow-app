import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { appendStmt } from '../../core/model/program'
import { getTemplate, resetCustomTemplates } from '../../core/templates'
import { createProjectRecord } from '../../shared/storage/projects'
import { useProjectStore } from '../editor/store/projectStore'
import { useUiStore } from '../editor/store/uiStore'
import { useRuntimeStore } from '../run/runtimeStore'
import { SourcePanel } from './SourcePanel'

function loadProgram(): void {
  const record = createProjectRecord('Source')
  record.program = appendStmt(record.program, 'Main', {
    kind: 'output',
    expression: '"Hello, world"',
    newline: true,
  })
  record.templateId = 'python'
  useProjectStore.getState().load(record)
  useUiStore.setState({ selectedFunction: 'Main', selectedPath: null })
  useRuntimeStore.setState({ status: 'idle', activePath: null })
}

function codeText(): string {
  return document.querySelector('.cm-content')?.textContent ?? ''
}

beforeEach(() => {
  resetCustomTemplates()
  loadProgram()
})

test('renders generated code for the selected template', () => {
  render(<SourcePanel />)

  expect(screen.getByLabelText('Bahasa')).toHaveValue('python')
  expect(codeText()).toContain('print("Hello, world")')
})

test('switching the template regenerates the code and persists the choice', async () => {
  render(<SourcePanel />)

  await userEvent.selectOptions(screen.getByLabelText('Bahasa'), 'cpp')

  expect(codeText()).toContain('cout << "Hello, world" << endl;')
  expect(useProjectStore.getState().record?.templateId).toBe('cpp')
})

test('highlights and scrolls to the active runtime line', async () => {
  render(<SourcePanel />)

  await act(async () => {
    useRuntimeStore.setState({ status: 'paused', activePath: '0' })
  })

  const active = document.querySelector('.cm-activeLine')
  expect(active?.textContent).toContain('print("Hello, world")')
})

test('copies the generated code to the clipboard', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  render(<SourcePanel />)

  await userEvent.click(screen.getByLabelText('Salin kode'))

  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('print("Hello, world")'))
  expect(await screen.findByRole('status')).toHaveTextContent(/disalin/i)
})

test('imports a custom .fpgt template and rejects a duplicate', async () => {
  const python = getTemplate('python')
  if (!python) throw new Error('missing python template')
  const custom = python.source.replace('name = Python', 'name = My Python')
  const file = new File([custom], 'my-python.fpgt', { type: 'text/plain' })

  render(<SourcePanel />)
  const input = screen.getByLabelText('File template')

  await userEvent.upload(input, file)
  expect(await screen.findByRole('status')).toHaveTextContent(/diimpor/i)
  expect(useProjectStore.getState().record?.templateId).toBe('custom-my-python')
  expect(screen.getByLabelText('Bahasa')).toHaveValue('custom-my-python')

  await userEvent.upload(input, file)
  expect(await screen.findByRole('alert')).toHaveTextContent(/sudah/i)
})
