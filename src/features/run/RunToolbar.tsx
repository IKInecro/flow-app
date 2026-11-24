import { Pause, Play, SkipForward, Square } from 'lucide-react'
import { useProjectStore } from '../editor/store/projectStore'
import { useRuntimeStore } from './runtimeStore'

const SPEEDS = [
  { value: 0, label: 'Instan' },
  { value: 100, label: 'Cepat' },
  { value: 300, label: 'Normal' },
  { value: 600, label: 'Lambat' },
]

const STATUS: Record<string, string> = {
  idle: 'Siap',
  running: 'Berjalan',
  paused: 'Jeda',
  'awaiting-input': 'Menunggu input',
  done: 'Selesai',
  error: 'Gagal',
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

  const idle = status === 'idle' || status === 'done' || status === 'error'
  const busy = status === 'running' || status === 'awaiting-input'

  return (
    <div className={`run-pill run-pill--${status}`} role="toolbar" aria-label="Kontrol run">
      <span className="run-pill__status">
        <span className="run-pill__dot" aria-hidden="true" />
        {STATUS[status] ?? status}
      </span>

      {idle ? (
        <button
          type="button"
          className="run-pill__button run-pill__button--primary"
          disabled={!program}
          onClick={() => program && void startRun(program)}
        >
          <Play size={15} aria-hidden="true" />
          Jalankan
        </button>
      ) : null}

      {status === 'running' ? (
        <button type="button" className="run-pill__button" onClick={pauseRun}>
          <Pause size={15} aria-hidden="true" />
          Jeda
        </button>
      ) : null}

      {status === 'paused' ? (
        <>
          <button
            type="button"
            className="run-pill__button run-pill__button--primary"
            onClick={() => void resumeRun()}
          >
            <Play size={15} aria-hidden="true" />
            Lanjut
          </button>
          <button
            type="button"
            className="run-pill__button"
            disabled={!program}
            onClick={() => program && void stepRun(program)}
          >
            <SkipForward size={15} aria-hidden="true" />
            Langkah
          </button>
        </>
      ) : null}

      {idle ? (
        <button
          type="button"
          className="run-pill__button"
          disabled={!program}
          onClick={() => program && void stepRun(program)}
        >
          <SkipForward size={15} aria-hidden="true" />
          Langkah
        </button>
      ) : null}

      <label className="run-pill__speed">
        <span>Kecepatan</span>
        <select
          aria-label="Kecepatan"
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

      {!idle || busy ? (
        <button type="button" className="run-pill__button run-pill__button--stop" onClick={stopRun}>
          <Square size={14} aria-hidden="true" />
          Hentikan
        </button>
      ) : null}
    </div>
  )
}
