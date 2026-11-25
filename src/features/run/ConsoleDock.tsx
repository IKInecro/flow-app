import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChevronDown, Terminal, ToggleLeft, ToggleRight } from 'lucide-react'
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
  const [draft, setDraft] = useState('')
  const bottom = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' })
  }, [entries.length, status])

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!draft.trim()) return
    const text = draft
    setDraft('')
    await submitInput(text)
  }

  return (
    <section className={`console ${open ? '' : 'console--closed'}`} aria-label="Console" aria-live="polite">
      <header className="console__head">
        <span className="console__title">
          <Terminal size={14} aria-hidden="true" />
          Console
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
            aria-expanded={open}
            aria-label={open ? 'Hide console' : 'Show console'}
            title={open ? 'Hide' : 'Show'}
            onClick={toggleConsole}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </header>

      <div className="console__scroll" aria-hidden={!open}>
        <div className="console__body">
          {entries.length === 0 && status === 'idle' ? (
            <p className="console__empty">Press Run to see your program output here.</p>
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
    </section>
  )
}
