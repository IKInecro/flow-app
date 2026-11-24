import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'
import { appendStmt } from '../core/model/program'
import { createProjectRecord } from '../shared/storage/projects'
import { useProjectStore } from '../features/editor/store/projectStore'
import { useUiStore } from '../features/editor/store/uiStore'
import { useRuntimeStore } from '../features/run/runtimeStore'
import { CommandPalette, filterActions, type PaletteAction } from './CommandPalette'

function loadProgram(): void {
  const record = createProjectRecord('Palette')
  record.program = appendStmt(record.program, 'Main', {
    kind: 'output',
    expression: '"halo"',
    newline: true,
  })
  useProjectStore.getState().load(record)
  useUiStore.setState({ commandOpen: true, inspectorTab: 'properties' })
  useRuntimeStore.setState({
    status: 'idle',
    activePath: null,
    entries: [],
    variables: [],
    callStack: [],
    pendingInput: undefined,
    error: undefined,
  })
}

beforeEach(() => {
  useProjectStore.getState().create('Palette')
  loadProgram()
})

test('filters actions by label or English keyword', () => {
  const actions: PaletteAction[] = [
    { id: 'run', label: 'Jalankan program', keywords: ['run'], run: () => undefined },
    { id: 'code', label: 'Buka panel kode', keywords: ['source'], run: () => undefined },
  ]

  expect(filterActions('jalankan', actions).map((action) => action.id)).toEqual(['run'])
  expect(filterActions('run', actions).map((action) => action.id)).toEqual(['run'])
  expect(filterActions('zzz', actions)).toEqual([])
  expect(filterActions('', actions).map((action) => action.id)).toEqual(['run', 'code'])
})

test('runs a filtered command and closes the palette', async () => {
  render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  )

  expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('Cari perintah'), 'jalankan')
  await userEvent.click(screen.getByRole('option', { name: /jalankan program/i }))

  await waitFor(() => expect(useRuntimeStore.getState().status).toBe('done'))
  expect(useUiStore.getState().commandOpen).toBe(false)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('opens editor panels from the palette', async () => {
  render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  )

  await userEvent.type(screen.getByLabelText('Cari perintah'), 'panel kode')
  await userEvent.click(screen.getByRole('option', { name: /panel kode/i }))

  expect(useUiStore.getState().inspectorTab).toBe('source')
})
