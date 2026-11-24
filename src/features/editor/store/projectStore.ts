import { create } from 'zustand'
import { createProgram } from '../../../core/model/program'
import type { Program } from '../../../core/model/types'
import {
  createProjectRecord,
  putProject,
  type ProjectRecord,
  type ViewState,
} from '../../../shared/storage/projects'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface ProjectState {
  program: Program | null
  record: ProjectRecord | null
  projectId: string | null
  dirty: boolean
  saveState: SaveState
  viewState: ViewState
  undoStack: Program[]
  redoStack: Program[]
  canUndo: boolean
  canRedo: boolean
  load: (record: ProjectRecord) => void
  create: (name: string) => void
  commit: (updater: (program: Program) => Program) => void
  setNodeOffset: (path: string, offset: { x: number; y: number }) => void
  clearOffsets: () => void
  undo: () => void
  redo: () => void
  markSaved: () => void
}

const HISTORY_LIMIT = 60
let saveTimer: ReturnType<typeof setTimeout> | null = null

function cancelSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}

export const useProjectStore = create<ProjectState>((set, get) => {
  function scheduleSave(): void {
    cancelSave()
    const state = get()
    if (!state.projectId || !state.program || !state.record) return
    set({ saveState: 'saving' })
    saveTimer = setTimeout(() => {
      saveTimer = null
      const current = get()
      if (!current.projectId || !current.program || !current.record) return
      const snapshot: ProjectRecord = {
        ...current.record,
        id: current.projectId,
        program: current.program,
        viewState: current.viewState,
        templateId: current.record.templateId,
        updatedAt: Date.now(),
        schemaVersion: 1,
      }
      void putProject(snapshot)
        .then(() => {
          if (get().program === snapshot.program) set({ saveState: 'saved', dirty: false })
        })
        .catch(() => set({ saveState: 'error' }))
    }, 500)
  }

  return {
    program: null,
    record: null,
    projectId: null,
    dirty: false,
    saveState: 'idle',
    viewState: { nodeOffsets: {} },
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,

    load(record) {
      cancelSave()
      set({
        program: record.program,
        record,
        projectId: record.id,
        dirty: false,
        saveState: 'saved',
        viewState: { nodeOffsets: { ...record.viewState.nodeOffsets } },
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
      })
    },

    create(name) {
      cancelSave()
      set({
        program: createProgram(name),
        record: null,
        projectId: null,
        dirty: false,
        saveState: 'idle',
        viewState: { nodeOffsets: {} },
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
      })
    },

    commit(updater) {
      const state = get()
      if (!state.program) return
      const next = updater(state.program)
      if (next === state.program) return
      const undoStack = [...state.undoStack, state.program].slice(-HISTORY_LIMIT)
      set({
        program: next,
        undoStack,
        redoStack: [],
        canUndo: true,
        canRedo: false,
        dirty: true,
      })
      scheduleSave()
    },

    setNodeOffset(path, offset) {
      const state = get()
      set({
        viewState: {
          nodeOffsets: { ...state.viewState.nodeOffsets, [path]: offset },
        },
      })
      scheduleSave()
    },

    clearOffsets() {
      set({ viewState: { nodeOffsets: {} } })
      scheduleSave()
    },

    undo() {
      const state = get()
      const previous = state.undoStack.at(-1)
      if (!previous || !state.program) return
      set({
        program: previous,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.program],
        canUndo: state.undoStack.length > 1,
        canRedo: true,
        dirty: true,
      })
      scheduleSave()
    },

    redo() {
      const state = get()
      const next = state.redoStack.at(-1)
      if (!next || !state.program) return
      set({
        program: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.program],
        canUndo: true,
        canRedo: state.redoStack.length > 1,
        dirty: true,
      })
      scheduleSave()
    },

    markSaved() {
      set({ saveState: 'saved', dirty: false })
    },
  }
})

export { createProjectRecord }
