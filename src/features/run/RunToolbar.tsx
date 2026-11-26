import { Eraser, Pause, Play, RotateCcw, SkipForward, Square } from 'lucide-react'
import { useProjectStore } from '../editor/store/projectStore'
import { useUiStore } from '../editor/store/uiStore'
import { useRuntimeStore } from './runtimeStore'

const SPEEDS = [
  { value: 0, label: 'Instant' },
  { value: 150, label: 'Fast' },
  { value: 400, label: 'Normal' },
  { value: 800, label: 'Slow' },
]

const STATUS: Record<string, string> = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
  'awaiting-input': 'Waiting for input',
  done: 'Finished',
  error: 'Failed',
}

export function RunToolbar() {
  const program = useProjectStore((state) => state.program)
  const status = useRuntimeStore((state) => state.status)
  const speed = useRuntimeStore((state) => state.speed)
  const setSpeed = useRuntimeStore((state) => state.setSpeed)
  const startRun = useRuntimeStore((state) => state.startRun)
  const stepRun = useRuntimeStore((state) => state.stepRun)
  const pauseRun = useRuntimeStore((state) => state.pauseRun)
  const resumeRun = useRuntimeStore((state) => state.resumeRun)
  const stopRun = useRuntimeStore((state) => state.stopRun)
  const resetRun = useRuntimeStore((state) => state.resetRun)
  const entries = useRuntimeStore((state) => state.entries)
  const openConsole = useUiStore((state) => state.openConsole)

  const idle = status === 'idle' || status === 'done' || status === 'error'
  const running = status === 'running'
  const paused = status === 'paused'
  const active = running || paused || status === 'awaiting-input'
  const hasHistory = status !== 'idle' || entries.length > 0

  function run(): void {
    if (!program) return
    openConsole()
    void startRun(program)
  }

  function step(): void {
    if (!program) return
    openConsole()
    void stepRun(program)
  }

  function resume(): void {
    openConsole()
    void resumeRun()
  }

  return (
    <div className={`run-pill run-pill--${status}`} role="toolbar" aria-label="Run controls">
      <span className="run-pill__status">
        <span className="run-pill__dot" aria-hidden="true" />
        {STATUS[status] ?? status}
      </span>

      {idle ? (
        <button
          type="button"
          className="run-pill__button run-pill__button--primary"
          disabled={!program}
          onClick={run}
        >
          {status === 'idle' ? <Play size={15} aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />}
          {status === 'idle' ? 'Run' : 'Run again'}
        </button>
      ) : null}

      {running ? (
        <button type="button" className="run-pill__button" onClick={pauseRun}>
          <Pause size={15} aria-hidden="true" />
          Pause
        </button>
      ) : null}

      {paused ? (
        <>
          <button
            type="button"
            className="run-pill__button run-pill__button--primary"
            onClick={resume}
          >
            <Play size={15} aria-hidden="true" />
            Resume
          </button>
          <button
            type="button"
            className="run-pill__button"
            disabled={!program}
            onClick={step}
          >
            <SkipForward size={15} aria-hidden="true" />
            Step
          </button>
        </>
      ) : null}

      {idle ? (
        <button
          type="button"
          className="run-pill__button"
          disabled={!program}
          onClick={step}
        >
          <SkipForward size={15} aria-hidden="true" />
          Step
        </button>
      ) : null}

      {hasHistory ? (
        <button
          type="button"
          className="run-pill__button"
          title="Clear the console, variables, and highlight"
          onClick={resetRun}
        >
          <Eraser size={14} aria-hidden="true" />
          Reset
        </button>
      ) : null}

      {active ? (
        <button
          type="button"
          className="run-pill__button run-pill__button--stop"
          onClick={stopRun}
        >
          <Square size={13} aria-hidden="true" />
          Stop
        </button>
      ) : null}

      <label className="run-pill__speed">
        <span>Speed</span>
        <select
          aria-label="Run speed"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
        >
          {SPEEDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
