import type { Program } from '../../core/model/types'
import type { RuntimeError, RuntimeEvent } from '../../core/vm/events'
import { createInterpreter } from '../../core/vm/interpreter'

export type RuntimeStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'awaiting-input'
  | 'done'
  | 'error'

export interface ConsoleEntry {
  kind: 'output' | 'input' | 'error' | 'system'
  text: string
  path?: string
}

export interface WatchVariable {
  functionName: string
  name: string
  type: string
  value: string
  arrayItems?: { index: number; value: string }[]
}

export interface CallFrame {
  functionName: string
  path?: string
}

export interface PendingInput {
  variable: string
  expectedType: string
}

export interface RuntimeState {
  status: RuntimeStatus
  activePath: string | null
  entries: ConsoleEntry[]
  variables: WatchVariable[]
  callStack: CallFrame[]
  pendingInput?: PendingInput
  error?: RuntimeError
}

export interface StartOptions {
  ignoreBreakpoints?: boolean
}

export interface RunController {
  start(program: Program, options?: StartOptions): Promise<void>
  step(program: Program): Promise<void>
  pause(): void
  resume(): Promise<void>
  stop(): void
  submitInput(text: string): Promise<void>
  setSpeed(ms: number): void
  getState(): RuntimeState
}

export const INITIAL_RUNTIME_STATE: RuntimeState = {
  status: 'idle',
  activePath: null,
  entries: [],
  variables: [],
  callStack: [],
}

const delay = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve())

export function createRunController(
  onChange: (state: RuntimeState) => void,
): RunController {
  let state: RuntimeState = { ...INITIAL_RUNTIME_STATE }
  let generator: AsyncGenerator<RuntimeEvent, void, string> | null = null
  let inputSlot = ''
  let queuedInput: string | null = null
  let lastEvent: RuntimeEvent['type'] | null = null
  let speed = 0

  function publish(): void {
    onChange({ ...state, entries: [...state.entries] })
  }

  function patch(changes: Partial<RuntimeState>): void {
    state = { ...state, ...changes }
  }

  function entry(entry: ConsoleEntry): void {
    state = { ...state, entries: [...state.entries, entry] }
  }

  function handle(event: RuntimeEvent): void {
    lastEvent = event.type
    switch (event.type) {
      case 'start':
        if (state.status !== 'paused') patch({ status: 'running' })
        break
      case 'nodeEnter':
        patch({ activePath: event.path })
        break
      case 'nodeExit':
        break
      case 'output':
        entry({ kind: 'output', text: event.text, path: event.path })
        break
      case 'inputRequest':
        patch({
          status: 'awaiting-input',
          pendingInput: { variable: event.variable, expectedType: event.expectedType },
        })
        break
      case 'inputAccept':
        entry({ kind: 'input', text: event.value })
        patch({ status: 'running', pendingInput: undefined })
        break
      case 'inputError':
        entry({ kind: 'error', text: event.message, path: event.path })
        patch({ status: 'awaiting-input' })
        break
      case 'breakpoint':
        patch({ status: 'paused', activePath: event.path })
        break
      case 'callEnter':
        patch({ activePath: event.path })
        break
      case 'callExit':
        break
      case 'snapshot':
        patch({
          variables: event.frames.flatMap((frame) =>
            frame.variables.map((variable) => ({ ...variable, functionName: frame.functionName })),
          ),
          callStack: event.frames.map((frame) => ({ functionName: frame.functionName })),
        })
        break
      case 'error':
        entry({
          kind: 'error',
          text: `${event.error.message} (${event.error.function}:${event.error.path})`,
          path: event.error.path,
        })
        patch({ status: 'error', error: event.error, activePath: event.error.path })
        break
      case 'done':
        patch({ status: 'done', activePath: null, pendingInput: undefined })
        break
    }
  }

  async function pump(stopAtNodeEnter: boolean): Promise<void> {
    while (generator) {
      let step: IteratorResult<RuntimeEvent, void>
      try {
        step = await generator.next(inputSlot)
      } catch (error) {
        entry({
          kind: 'error',
          text: error instanceof Error ? error.message : 'Runtime berhenti tak terduga.',
        })
        patch({ status: 'error' })
        generator = null
        publish()
        return
      }
      inputSlot = ''

      if (step.done) {
        generator = null
        if (state.status === 'running') patch({ status: 'done', activePath: null })
        publish()
        return
      }

      const event = step.value
      handle(event)
      publish()

      if (event.type === 'done') {
        generator = null
        return
      }
      if (event.type === 'inputRequest' && queuedInput !== null) {
        inputSlot = queuedInput
        queuedInput = null
        patch({ status: 'running', pendingInput: undefined })
        publish()
        continue
      }
      if (event.type === 'error' || event.type === 'breakpoint' || event.type === 'inputRequest') {
        return
      }
      if (stopAtNodeEnter && event.type === 'nodeEnter') return
      if (!stopAtNodeEnter && state.status !== 'running') return
      if (speed > 0) await delay(speed)
    }
  }

  function ensureGenerator(program: Program, options: StartOptions): void {
    if (generator) void generator.return()
    state = { ...INITIAL_RUNTIME_STATE, entries: [] }
    inputSlot = ''
    queuedInput = null
    lastEvent = null
    generator = createInterpreter(program, {
      ignoreBreakpoints: options.ignoreBreakpoints,
    })
  }

  return {
    async start(program, options = {}) {
      ensureGenerator(program, options)
      patch({ status: 'running' })
      publish()
      await pump(false)
    },

    async step(program) {
      if (state.status === 'awaiting-input') return
      if (!generator || state.status === 'done' || state.status === 'error' || state.status === 'idle') {
        ensureGenerator(program, {})
      }
      patch({ status: 'paused' })
      publish()
      await pump(true)
      if (state.status === 'running') {
        patch({ status: 'paused' })
        publish()
      }
    },

    pause() {
      if (state.status !== 'running') return
      patch({ status: 'paused' })
      publish()
    },

    async resume() {
      if (!generator || state.status !== 'paused') return
      patch({ status: 'running' })
      publish()
      await pump(false)
    },

    stop() {
      if (generator) {
        void generator.return()
        generator = null
      }
      inputSlot = ''
      queuedInput = null
      lastEvent = null
      patch({ status: 'idle', activePath: null, pendingInput: undefined })
      publish()
    },

    async submitInput(text) {
      if (state.status !== 'awaiting-input') return
      if (lastEvent === 'inputRequest') inputSlot = text
      else queuedInput = text
      patch({ status: 'running', pendingInput: undefined })
      publish()
      await pump(false)
    },

    setSpeed(ms) {
      speed = ms
    },

    getState() {
      return state
    },
  }
}
