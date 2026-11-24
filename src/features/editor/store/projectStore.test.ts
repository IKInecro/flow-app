import 'fake-indexeddb/auto'
import { clear } from 'idb-keyval'
import { beforeEach, expect, test, vi } from 'vitest'
import { appendStmt } from '../../../core/model/program'
import { projectStore } from '../../../shared/storage/db'
import { createProjectRecord, getProject, putProject } from '../../../shared/storage/projects'
import { useProjectStore } from './projectStore'

beforeEach(async () => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  await clear(projectStore)
})

test('create yields a Main-only program with no unsaved changes', () => {
  useProjectStore.getState().create('Test')
  const state = useProjectStore.getState()
  expect(state.program?.functions).toHaveLength(1)
  expect(state.program?.functions[0].body).toEqual([])
  expect(state.dirty).toBe(false)
})

test('commit records undo history and undo/redo restore programs', async () => {
  const record = await putProject(createProjectRecord('Test'))
  useProjectStore.getState().load(record)

  useProjectStore.getState().commit((program) =>
    appendStmt(program, 'Main', { kind: 'output', expression: '"hi"', newline: true }),
  )
  expect(useProjectStore.getState().dirty).toBe(true)
  expect(useProjectStore.getState().program?.functions[0].body).toHaveLength(1)

  useProjectStore.getState().undo()
  expect(useProjectStore.getState().program?.functions[0].body).toHaveLength(0)
  expect(useProjectStore.getState().canRedo).toBe(true)

  useProjectStore.getState().redo()
  expect(useProjectStore.getState().program?.functions[0].body).toHaveLength(1)
})

test('a new commit clears redo history', async () => {
  const record = await putProject(createProjectRecord('Test'))
  useProjectStore.getState().load(record)

  useProjectStore.getState().commit((program) =>
    appendStmt(program, 'Main', { kind: 'comment', text: 'a' }),
  )
  useProjectStore.getState().undo()
  expect(useProjectStore.getState().canRedo).toBe(true)

  useProjectStore.getState().commit((program) =>
    appendStmt(program, 'Main', { kind: 'comment', text: 'b' }),
  )
  expect(useProjectStore.getState().canRedo).toBe(false)
})

test('loading a record resets history', async () => {
  const record = await putProject(createProjectRecord('Test'))
  useProjectStore.getState().load(record)
  useProjectStore.getState().commit((program) =>
    appendStmt(program, 'Main', { kind: 'comment', text: 'a' }),
  )
  useProjectStore.getState().load(record)
  expect(useProjectStore.getState().canUndo).toBe(false)
  expect(useProjectStore.getState().dirty).toBe(false)
})

test('edits are persisted after the autosave debounce', async () => {
  const record = await putProject(createProjectRecord('Autosave'))
  useProjectStore.getState().load(record)

  vi.useFakeTimers()
  useProjectStore.getState().commit((program) =>
    appendStmt(program, 'Main', { kind: 'output', expression: '1', newline: true }),
  )
  await vi.advanceTimersByTimeAsync(700)
  vi.useRealTimers()

  const saved = await getProject(record.id)
  expect(saved?.program.functions[0].body).toHaveLength(1)
})

test('node offsets are stored without entering undo history', async () => {
  const record = await putProject(createProjectRecord('Offsets'))
  useProjectStore.getState().load(record)
  useProjectStore.getState().setNodeOffset('0', { x: 12, y: 34 })
  expect(useProjectStore.getState().viewState.nodeOffsets['0']).toEqual({ x: 12, y: 34 })
  expect(useProjectStore.getState().canUndo).toBe(false)

  useProjectStore.getState().clearOffsets()
  expect(useProjectStore.getState().viewState.nodeOffsets).toEqual({})
})
