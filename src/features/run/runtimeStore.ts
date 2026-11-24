import { create } from 'zustand'
import type { Program } from '../../core/model/types'
import {
  createRunController,
  INITIAL_RUNTIME_STATE,
  type RunController,
  type RuntimeState,
  type StartOptions,
} from './controller'

interface RuntimeStore extends RuntimeState {
  speed: number
  startRun: (program: Program, options?: StartOptions) => Promise<void>
  stepRun: (program: Program) => Promise<void>
  pauseRun: () => void
  resumeRun: () => Promise<void>
  stopRun: () => void
  submitInput: (text: string) => Promise<void>
  setSpeed: (ms: number) => void
}

let controller: RunController | null = null

export function getRunController(): RunController {
  if (!controller) {
    controller = createRunController((state) => {
      useRuntimeStore.setState(state)
    })
  }
  return controller
}

export const useRuntimeStore = create<RuntimeStore>((set, get) => ({
  ...INITIAL_RUNTIME_STATE,
  speed: 400,

  async startRun(program, options) {
    const active = getRunController()
    active.setSpeed(get().speed)
    await active.start(program, options)
  },

  async stepRun(program) {
    await getRunController().step(program)
  },

  pauseRun() {
    getRunController().pause()
  },

  async resumeRun() {
    await getRunController().resume()
  },

  stopRun() {
    getRunController().stop()
  },

  async submitInput(text) {
    await getRunController().submitInput(text)
  },

  setSpeed(ms) {
    getRunController().setSpeed(ms)
    set({ speed: ms })
  },
}))
