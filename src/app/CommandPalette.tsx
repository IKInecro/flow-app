import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '../shared/ui/Dialog'
import { downloadFprg } from '../features/editor/export/files'
import { useProjectStore } from '../features/editor/store/projectStore'
import { useUiStore } from '../features/editor/store/uiStore'
import { useRuntimeStore } from '../features/run/runtimeStore'

export interface PaletteAction {
  id: string
  label: string
  hint?: string
  keywords?: string[]
  run: () => void | Promise<void>
}

export function scoreMatch(query: string, text: string): number | null {
  const needle = query.trim().toLowerCase()
  if (!needle) return 0
  const haystack = text.toLowerCase()
  let position = 0
  let score = 0
  let streak = 0
  for (const char of needle) {
    const found = haystack.indexOf(char, position)
    if (found === -1) return null
    streak = found === position ? streak + 1 : 0
    score += 10 + streak * 4 - Math.min(9, found - position)
    position = found + 1
  }
  return score
}

export function filterActions(query: string, actions: PaletteAction[]): PaletteAction[] {
  return actions
    .map((action) => {
      const candidates = [action.label, ...(action.keywords ?? [])]
      const scores = candidates
        .map((candidate) => scoreMatch(query, candidate))
        .filter((value): value is number => value !== null)
      return { action, score: scores.length ? Math.max(...scores) : null }
    })
    .filter((item): item is { action: PaletteAction; score: number } => item.score !== null)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.action)
}

export function CommandPalette() {
  const open = useUiStore((state) => state.commandOpen)
  const setOpen = useUiStore((state) => state.setCommandOpen)
  const setInspectorTab = useUiStore((state) => state.setInspectorTab)
  const program = useProjectStore((state) => state.program)
  const undo = useProjectStore((state) => state.undo)
  const redo = useProjectStore((state) => state.redo)
  const startRun = useRuntimeStore((state) => state.startRun)
  const stepRun = useRuntimeStore((state) => state.stepRun)
  const stopRun = useRuntimeStore((state) => state.stopRun)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement | null>(null)

  const actions = useMemo<PaletteAction[]>(() => {
    const items: PaletteAction[] = [
      {
        id: 'run',
        label: 'Jalankan program',
        hint: 'F5',
        keywords: ['run', 'jalankan', 'mulai'],
        run: () => {
          if (program) void startRun(program)
        },
      },
      {
        id: 'step',
        label: 'Langkah berikutnya',
        hint: 'F10',
        keywords: ['step', 'langkah', 'debug'],
        run: () => {
          if (program) void stepRun(program)
        },
      },
      {
        id: 'stop',
        label: 'Hentikan program',
        keywords: ['stop', 'berhenti', 'reset'],
        run: stopRun,
      },
      {
        id: 'export-fprg',
        label: 'Ekspor proyek .fprg',
        hint: 'Ctrl+S',
        keywords: ['export', 'simpan', 'save', 'download', 'fprg'],
        run: () => {
          if (program) downloadFprg(program)
        },
      },
      {
        id: 'undo',
        label: 'Undo',
        hint: 'Ctrl+Z',
        keywords: ['undo', 'batalkan'],
        run: undo,
      },
      {
        id: 'redo',
        label: 'Redo',
        hint: 'Ctrl+Y',
        keywords: ['redo', 'ulangi'],
        run: redo,
      },
      {
        id: 'panel-source',
        label: 'Buka panel kode',
        keywords: ['source', 'kode', 'code', 'generate'],
        run: () => setInspectorTab('source'),
      },
      {
        id: 'panel-variables',
        label: 'Buka panel variabel',
        keywords: ['variables', 'variabel', 'watch'],
        run: () => setInspectorTab('variables'),
      },
      {
        id: 'panel-functions',
        label: 'Buka panel function',
        keywords: ['function', 'fungsi'],
        run: () => setInspectorTab('functions'),
      },
      {
        id: 'projects',
        label: 'Kembali ke proyek',
        keywords: ['projects', 'proyek', 'home', 'beranda'],
        run: () => navigate('/'),
      },
    ]
    return items
  }, [navigate, program, redo, setInspectorTab, startRun, stepRun, stopRun, undo])

  const results = useMemo(() => filterActions(query, actions), [actions, query])

  useEffect(() => {
    setActive(0)
  }, [query, open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  function execute(action: PaletteAction | undefined): void {
    if (!action) return
    setOpen(false)
    void action.run()
  }

  function move(delta: number): void {
    if (results.length === 0) return
    setActive((current) => (current + delta + results.length) % results.length)
  }

  return (
    <Dialog open={open} title="Perintah" onClose={() => setOpen(false)} className="palette">
      <div className="palette__search">
        <input
          aria-label="Cari perintah"
          autoFocus
          value={query}
          placeholder="Cari perintah…"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              move(1)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              move(-1)
            } else if (event.key === 'Enter') {
              event.preventDefault()
              execute(results[active] ?? results[0])
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setOpen(false)
            }
          }}
        />
      </div>
      <ul className="palette__list" role="listbox" aria-label="Perintah" ref={listRef}>
        {results.length === 0 ? (
          <li className="palette__empty">Tidak ada perintah yang cocok.</li>
        ) : (
          results.map((action, index) => (
            <li key={action.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={`palette__item ${index === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => execute(action)}
              >
                <span>{action.label}</span>
                {action.hint ? <kbd>{action.hint}</kbd> : null}
              </button>
            </li>
          ))
        )}
      </ul>
    </Dialog>
  )
}
