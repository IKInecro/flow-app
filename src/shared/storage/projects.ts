import { createProgram } from '../../core/model/program'
import type { Program } from '../../core/model/types'
import { db } from './db'

export interface ViewState {
  nodeOffsets: Record<string, { x: number; y: number }>
}

export interface ProjectRecord {
  id: string
  program: Program
  viewState: ViewState
  templateId: string
  createdAt: number
  updatedAt: number
  schemaVersion: 1
}

export type StorageStatus = 'ok' | 'memory'

const mirror = new Map<string, ProjectRecord>()
let status: StorageStatus = 'ok'

const WARNING =
  'Browser storage is unavailable or full. The project is only kept in memory — export a backup now.'

export function getStorageStatus(): StorageStatus {
  return status
}

export function getStorageWarning(): string | null {
  return status === 'memory' ? WARNING : null
}

function degrade(): void {
  status = 'memory'
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createProjectRecord(name: string): ProjectRecord {
  const now = Date.now()
  return {
    id: newId(),
    program: createProgram(name),
    viewState: { nodeOffsets: {} },
    templateId: 'python',
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  }
}

export function normalizeRecord(raw: unknown): ProjectRecord {
  const source = (raw ?? {}) as Partial<ProjectRecord> & Record<string, unknown>
  const now = Date.now()
  return {
    ...source,
    id: typeof source.id === 'string' ? source.id : newId(),
    program: (source.program as Program) ?? createProgram(''),
    viewState: {
      nodeOffsets: source.viewState?.nodeOffsets ?? {},
    },
    templateId: typeof source.templateId === 'string' ? source.templateId : 'python',
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : now,
    schemaVersion: 1,
  }
}

export async function listProjects(): Promise<ProjectRecord[]> {
  if (status === 'memory') {
    return Array.from(mirror.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }
  try {
    const rows = await db.entries<ProjectRecord>()
    mirror.clear()
    for (const [, value] of rows) {
      if (!value) continue
      const record = normalizeRecord(value)
      mirror.set(record.id, record)
    }
  } catch {
    degrade()
  }
  return Array.from(mirror.values()).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  if (status === 'memory') return mirror.get(id) ?? null
  try {
    const value = await db.get<ProjectRecord>(id)
    if (!value) return null
    const record = normalizeRecord(value)
    mirror.set(record.id, record)
    return record
  } catch {
    degrade()
    return mirror.get(id) ?? null
  }
}

export async function putProject(record: ProjectRecord): Promise<ProjectRecord> {
  const saved: ProjectRecord = { ...record, updatedAt: Date.now(), schemaVersion: 1 }
  mirror.set(saved.id, saved)
  try {
    await db.set(saved.id, saved)
  } catch {
    degrade()
  }
  return saved
}

export async function deleteProject(id: string): Promise<void> {
  mirror.delete(id)
  try {
    await db.del(id)
  } catch {
    degrade()
  }
}

export async function duplicateProject(id: string): Promise<ProjectRecord | null> {
  const source = await getProject(id)
  if (!source) return null
  const now = Date.now()
  const copy: ProjectRecord = {
    ...source,
    id: newId(),
    program: structuredClone(source.program),
    viewState: structuredClone(source.viewState),
    createdAt: now,
    updatedAt: now,
  }
  copy.program.meta.name = `${source.program.meta.name} (copy)`
  return putProject(copy)
}
