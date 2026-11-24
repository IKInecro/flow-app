import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Terminal, ToggleLeft, ToggleRight } from 'lucide-react'
import { useUiStore } from '../editor/store/uiStore'
import { useRuntimeStore } from './runtimeStore'

const PREFIX: Record<string, string> = {
  output: '> ',
  input: '? ',
  error: '! ',
  system: '# ',
}

export function ConsoleDock() {
  const entries = useRuntimeStore((state) => state.entries)
  const status = useRuntimeStore((state) => state.status)
  const pendingInput = useRuntimeStore((state) => state.pendingInput)
  const submitInput = useRuntimeStore((state) => state.submitInput)
  const stopRun = useRuntimeStore((state) => state.stopRun)
  const consoleMode = useUiStore((state) => state.consoleMode)
  const setConsoleMode = useUiStore((state) => state.setConsoleMode)
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
    <section className="console" aria-label="Console" aria-live="polite">
      <header className="console__head">
        <span className="console__title">
          <Terminal size={14} aria-hidden="true" />
          Console
        </span>
        <span className={`console__status console__status--${status}`}>{status}</span>
        <button
          type="button"
          className="console__toggle"
          aria-label={consoleMode === 'plain' ? 'Mode chat' : 'Mode plain'}
          title={consoleMode === 'plain' ? 'Kembali ke bubble' : 'Tampilkan sebagai teks'}
          onClick={() => setConsoleMode(consoleMode === 'plain' ? 'chat' : 'plain')}
        >
          {consoleMode === 'plain' ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          {consoleMode === 'plain' ? 'Chat' : 'Plain'}
        </button>
      </header>

      <div className="console__body">
        {entries.length === 0 && status === 'idle' ? (
          <p className="console__empty">Tekan Run untuk menjalankan program.</p>
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
              Kirim
            </button>
          </form>
        ) : null}
        <div ref={bottom} />
      </div>
    </section>
  )
}
