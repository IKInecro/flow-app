import 'fake-indexeddb/auto'
import { clear } from 'idb-keyval'
import { beforeEach, expect, test, vi } from 'vitest'
import { createProgram } from '../../core/model/program'
import { db, projectStore } from './db'
import {
  createProjectRecord,
  deleteProject,
  duplicateProject,
  getProject,
  getStorageStatus,
  getStorageWarning,
  listProjects,
  normalizeRecord,
  putProject,
} from './projects'

beforeEach(async () => {
  vi.restoreAllMocks()
  await clear(projectStore)
})

test('create and list projects sorted by updated time', async () => {
  let now = 1000
  vi.spyOn(Date, 'now').mockImplementation(() => now++)

  const a = createProjectRecord('Alpha')
  await putProject(a)
  const b = createProjectRecord('Beta')
  await putProject(b)

  const projects = await listProjects()
  expect(projects.map((item) => item.program.meta.name)).toEqual(['Beta', 'Alpha'])
  expect(projects[0].schemaVersion).toBe(1)
})

test('put updates the timestamp and get returns the record', async () => {
  let now = 2000
  vi.spyOn(Date, 'now').mockImplementation(() => now++)
  const record = createProjectRecord('Alpha')
  const first = await putProject(record)

  const stored = await getProject(record.id)
  expect(stored?.program.meta.name).toBe('Alpha')
  expect(stored?.updatedAt).toBe(first.updatedAt)
})

test('duplicate copies content with a new id and copy suffix', async () => {
  const record = await putProject(createProjectRecord('Alpha'))
  const copy = await duplicateProject(record.id)
  expect(copy).not.toBeNull()
  expect(copy?.id).not.toBe(record.id)
  expect(copy?.program.meta.name).toBe('Alpha (copy)')
  expect(await listProjects()).toHaveLength(2)
})

test('delete removes the record', async () => {
  const record = await putProject(createProjectRecord('Alpha'))
  await deleteProject(record.id)
  expect(await getProject(record.id)).toBeNull()
  expect(await listProjects()).toHaveLength(0)
})

test('quota failure switches to memory mode and keeps the record', async () => {
  const record = createProjectRecord('Offline')
  vi.spyOn(db, 'set').mockRejectedValue(new Error('QuotaExceededError'))

  await expect(putProject(record)).resolves.toBeDefined()
  expect(getStorageStatus()).toBe('memory')
  expect(getStorageWarning()).toMatch(/export|backup/i)

  const projects = await listProjects()
  expect(projects).toHaveLength(1)
  expect(projects[0].program.meta.name).toBe('Offline')
})

test('normalizeRecord fills defaults and preserves extra fields', () => {
  const program = createProgram('Old')
  const raw = {
    id: 'old-1',
    program,
    createdAt: 10,
    updatedAt: 20,
    extra: { keep: true },
  }
  const record = normalizeRecord(raw)
  expect(record.schemaVersion).toBe(1)
  expect(record.viewState).toEqual({ nodeOffsets: {} })
  expect(record.templateId).toBe('python')
  expect((record as unknown as { extra: { keep: boolean } }).extra.keep).toBe(true)
})
