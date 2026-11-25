import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { GripHorizontal, Terminal, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useUiStore } from '../editor/store/uiStore'
import { useRuntimeStore } from './runtimeStore'

const PREFIX: Record<string, string> = {
  output: '> ',
  input: '? ',
  error: '! ',
  system: '# ',
}

const STATUS: Record<string, string> = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
  'awaiting-input': 'Waiting for input',
  done: 'Finished',
  error: 'Failed',
}

interface Point {
  x: number
  y: number
}

const POS_KEY = 'marcoflow.console.pos'

function readPos(): Point | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<Point>
    if (typeof value.x !== 'number' || typeof value.y !== 'number') return null
    return { x: value.x, y: value.y }
  } catch {
    return null
  }
}

function persistPos(pos: Point | null): void {
  if (typeof localStorage === 'undefined') return
  if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos))
  else localStorage.removeItem(POS_KEY)
}

function clampPoint(pos: Point, width: number, height: number): Point {
  const maxX = Math.max(8, window.innerWidth - width - 8)
  const maxY = Math.max(8, window.innerHeight - height - 8)
  return {
    x: Math.min(Math.max(8, pos.x), maxX),
    y: Math.min(Math.max(8, pos.y), maxY),
  }
}

export function ConsoleDock() {
  const entries = useRuntimeStore((state) => state.entries)
  const status = useRuntimeStore((state) => state.status)
  const pendingInput = useRuntimeStore((state) => state.pendingInput)
  const submitInput = useRuntimeStore((state) => state.submitInput)
  const stopRun = useRuntimeStore((state) => state.stopRun)
  const consoleMode = useUiStore((state) => state.consoleMode)
  const setConsoleMode = useUiStore((state) => state.setConsoleMode)
  const open = useUiStore((state) => state.consoleOpen)
  const toggleConsole = useUiStore((state) => state.toggleConsole)
  const openConsole = useUiStore((state) => state.openConsole)
  const consoleWidth = useUiStore((state) => state.consoleWidth)
  const consoleHeight = useUiStore((state) => state.consoleHeight)
  const setLayout = useUiStore((state) => state.setLayout)
  const [draft, setDraft] = useState('')
  const [pos, setPos] = useState<Point | null>(() => readPos())
  const bottom = useRef<HTMLDivElement | null>(null)
  const panel = useRef<HTMLElement | null>(null)
  const posRef = useRef(pos)

  useEffect(() => {
    posRef.current = pos
  }, [pos])

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' })
  }, [entries.length, status])

  // Starting a program summons the terminal; closing it during a run stays closed.
  const previousStatus = useRef(status)
  useEffect(() => {
    const starting =
      previousStatus.current === 'idle' ||
      previousStatus.current === 'done' ||
      previousStatus.current === 'error'
    if (starting && status !== 'idle') openConsole()
    previousStatus.current = status
  }, [status, openConsole])

  useEffect(() => {
    if (!open || !pos) return
    const next = clampPoint(pos, consoleWidth, consoleHeight)
    if (next.x !== pos.x || next.y !== pos.y) setPos(next)
    // Only re-clamp when the terminal is summoned.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || pos) return
    const frame = window.requestAnimationFrame(() => {
      const rect = panel.current?.getBoundingClientRect()
      const width = rect?.width || consoleWidth
      const height = rect?.height || consoleHeight
      setPos(
        clampPoint(
          { x: window.innerWidth - width - 24, y: window.innerHeight - height - 24 },
          width,
          height,
        ),
      )
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, pos, consoleWidth, consoleHeight])

  useEffect(() => {
    function onResize(): void {
      setPos((current) =>
        current
          ? clampPoint(current, consoleWidth, consoleHeight)
          : current,
      )
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [consoleWidth, consoleHeight])

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!draft.trim()) return
    const text = draft
    setDraft('')
    await submitInput(text)
  }

  function startDrag(event: PointerEvent<HTMLElement>): void {
    if ((event.target as HTMLElement).closest('button, input, select, a')) return
    const rect = panel.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    const start = { px: event.clientX, py: event.clientY, x: rect.left, y: rect.top }
    setPos({ x: rect.left, y: rect.top })
    document.body.classList.add('is-moving-window')
    const target = event.currentTarget
    target.setPointerCapture?.(event.pointerId)

    function onMove(moveEvent: globalThis.PointerEvent): void {
      const next = clampPoint(
        {
          x: start.x + moveEvent.clientX - start.px,
          y: start.y + moveEvent.clientY - start.py,
        },
        consoleWidth,
        consoleHeight,
      )
      setPos(next)
      persistPos(next)
    }
    function onUp(): void {
      document.body.classList.remove('is-moving-window')
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
      persistPos(posRef.current)
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }

  function resizeWidth(delta: number): void {
    const max = Math.min(900, Math.max(360, window.innerWidth - (pos?.x ?? 0) - 16))
    setLayout({ consoleWidth: Math.min(max, Math.max(360, consoleWidth + delta)) })
  }

  function resizeHeight(delta: number): void {
    const max = Math.min(560, Math.max(160, window.innerHeight - (pos?.y ?? 0) - 16))
    setLayout({ consoleHeight: Math.min(max, Math.max(160, consoleHeight + delta)) })
  }

  function startResize(event: PointerEvent<HTMLButtonElement>): void {
    event.preventDefault()
    const start = { px: event.clientX, py: event.clientY, w: consoleWidth, h: consoleHeight }
    const target = event.currentTarget
    target.setPointerCapture?.(event.pointerId)
    document.body.classList.add('is-resizing-window')

    function onMove(moveEvent: globalThis.PointerEvent): void {
      const maxW = Math.min(900, Math.max(360, window.innerWidth - (pos?.x ?? 0) - 16))
      const maxH = Math.min(560, Math.max(160, window.innerHeight - (pos?.y ?? 0) - 16))
      setLayout({
        consoleWidth: Math.min(maxW, Math.max(360, start.w + moveEvent.clientX - start.px)),
        consoleHeight: Math.min(maxH, Math.max(160, start.h + moveEvent.clientY - start.py)),
      })
    }
    function onUp(): void {
      document.body.classList.remove('is-resizing-window')
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }

  function onResizeKey(event: KeyboardEvent<HTMLButtonElement>): void {
    const step = event.shiftKey ? 40 : 16
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      resizeWidth(step)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      resizeWidth(-step)
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      resizeHeight(step)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      resizeHeight(-step)
    }
  }

  return (
    <section
      ref={panel}
      className={`console console--float ${open ? '' : 'is-hidden'}`}
      style={{ width: consoleWidth, height: consoleHeight, ...(pos ? { left: pos.x, top: pos.y } : {}) }}
      aria-label="Console"
      aria-live="polite"
    >
      <header className="console__head" onPointerDown={startDrag}>
        <span className="console__lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="console__title">
          <Terminal size={14} aria-hidden="true" />
          Console
          <GripHorizontal size={13} className="console__grip" aria-hidden="true" />
        </span>
        <span className={`console__status console__status--${status}`}>{STATUS[status] ?? status}</span>
        <div className="console__actions">
          <button
            type="button"
            className="console__toggle"
            aria-label={consoleMode === 'plain' ? 'Chat mode' : 'Plain mode'}
            title={consoleMode === 'plain' ? 'Switch to bubbles' : 'Show as plain text'}
            onClick={() => setConsoleMode(consoleMode === 'plain' ? 'chat' : 'plain')}
          >
            {consoleMode === 'plain' ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
            {consoleMode === 'plain' ? 'Chat' : 'Plain'}
          </button>
          <button
            type="button"
            className="console__collapse"
            aria-label="Close console"
            title="Close"
            onClick={toggleConsole}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="console__scroll">
        <div className="console__body">
          {entries.length === 0 && status === 'idle' ? (
            <p className="console__empty">
              <span className="console__prompt-mark">$</span> Run a program to see its output here.
            </p>
          ) : consoleMode === 'plain' ? (
            <pre className="console__plain" data-testid="console-plain">
              {entries.map((entry) => `${PREFIX[entry.kind] ?? ''}${entry.text}`).join('\n')}
            </pre>
          ) : (
            <div className="console__chat">
              {entries.map((entry, index) => (
                <div
                  key={`${entry.kind}:${index}`}
                  className={`console-entry console-entry--${entry.kind}`}
                >
                  <span className="console-entry__text">{entry.text}</span>
                  {entry.path ? <span className="console-entry__path">{entry.path}</span> : null}
                </div>
              ))}
            </div>
          )}

          {status === 'awaiting-input' ? (
            <form className="console__prompt" onSubmit={(event) => void submit(event)}>
              <label htmlFor="mf-console-input">
                {pendingInput
                  ? `${pendingInput.variable} (${pendingInput.expectedType})`
                  : 'Input'}
              </label>
              <input
                id="mf-console-input"
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    stopRun()
                  }
                }}
              />
              <button type="submit" className="button button--primary">
                Send
              </button>
            </form>
          ) : null}
          <div ref={bottom} />
        </div>
      </div>

      <button
        type="button"
        className="console__resize"
        aria-label="Resize console"
        title="Drag to resize"
        onPointerDown={startResize}
        onKeyDown={onResizeKey}
      >
        <span aria-hidden="true" />
      </button>
    </section>
  )
}
