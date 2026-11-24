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
        label: 'Run program',
        hint: 'F5',
        keywords: ['run', 'start', 'play'],
        run: () => {
          if (program) void startRun(program)
        },
      },
      {
        id: 'step',
        label: 'Next step',
        hint: 'F10',
        keywords: ['step', 'next', 'debug'],
        run: () => {
          if (program) void stepRun(program)
        },
      },
      {
        id: 'stop',
        label: 'Stop program',
        keywords: ['stop', 'halt', 'reset'],
        run: stopRun,
      },
      {
        id: 'export-fprg',
        label: 'Export project .fprg',
        hint: 'Ctrl+S',
        keywords: ['export', 'save', 'download', 'fprg'],
        run: () => {
          if (program) downloadFprg(program)
        },
      },
      {
        id: 'undo',
        label: 'Undo',
        hint: 'Ctrl+Z',
        keywords: ['undo', 'revert'],
        run: undo,
      },
      {
        id: 'redo',
        label: 'Redo',
        hint: 'Ctrl+Y',
        keywords: ['redo', 'repeat'],
        run: redo,
      },
      {
        id: 'panel-source',
        label: 'Open code panel',
        keywords: ['source', 'code', 'generate'],
        run: () => setInspectorTab('source'),
      },
      {
        id: 'panel-variables',
        label: 'Open variables panel',
        keywords: ['variables', 'watch', 'values'],
        run: () => setInspectorTab('variables'),
      },
      {
        id: 'panel-functions',
        label: 'Open functions panel',
        keywords: ['function', 'functions'],
        run: () => setInspectorTab('functions'),
      },
      {
        id: 'projects',
        label: 'Back to projects',
        keywords: ['projects', 'home', 'hub'],
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
    <Dialog open={open} title="Commands" onClose={() => setOpen(false)} className="palette">
      <div className="palette__search">
        <input
          aria-label="Search commands"
          autoFocus
          value={query}
          placeholder="Search commands…"
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
      <ul className="palette__list" role="listbox" aria-label="Commands" ref={listRef}>
        {results.length === 0 ? (
          <li className="palette__empty">No matching commands.</li>
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
