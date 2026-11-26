import { useMemo, useState } from 'react'
import { GripVertical, Search, Sparkles, X } from 'lucide-react'
import { createStmt, insertStmt } from '../../../core/model/program'
import type { StmtKind } from '../../../core/model/types'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { INSERTABLE } from '../canvas/InsertMenu'
import { BLOCK_DRAG_TYPE } from '../canvas/FlowEdge'
import { categoryForKind, shapeForKind, shapePath } from '../canvas/shapePaths'

const GROUPS: { title: string; kinds: StmtKind[] }[] = [
  { title: 'Values', kinds: ['declare', 'assign', 'input', 'output'] },
  { title: 'Control flow', kinds: ['if', 'while', 'do', 'for'] },
  { title: 'Extras', kinds: ['call', 'comment', 'breakpoint'] },
]

const RECENT_KEY = 'marcoflow.recentBlocks'

const SEARCH_TERMS: Partial<Record<StmtKind, string>> = {
  declare: 'variable create',
  assign: 'value set change',
  input: 'read user',
  output: 'print show display',
  if: 'branch condition decision',
  while: 'loop repeat',
  do: 'loop repeat',
  for: 'loop count',
  call: 'function run',
  comment: 'note',
  breakpoint: 'debug pause stop',
}

function readRecent(): StmtKind[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    if (!Array.isArray(saved)) return []
    return saved
      .filter((kind): kind is StmtKind => INSERTABLE.some((item) => item.kind === kind))
      .slice(0, 4)
  } catch {
    return []
  }
}

function BlockPreview({ kind }: { kind: StmtKind }) {
  const shape = shapeForKind(kind)
  const width = shape === 'breakpoint' || shape === 'circle' ? 24 : 40
  return (
    <svg viewBox={`0 0 ${width} 24`} className="palette__shape" aria-hidden="true">
      <path d={shapePath(shape, width, 24)} />
    </svg>
  )
}

export function ShapePalette({ onClose }: { onClose?: () => void }) {
  const commit = useProjectStore((state) => state.commit)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const selectedPath = useUiStore((state) => state.selectedPath)
  const select = useUiStore((state) => state.select)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<StmtKind[]>(readRecent)

  function remember(kind: StmtKind): void {
    setRecent((current) => {
      const next = [kind, ...current.filter((item) => item !== kind)].slice(0, 4)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // Storage may be unavailable; recents still work for this visit.
      }
      return next
    })
  }

  function add(kind: StmtKind): void {
    remember(kind)
    commit((program) => {
      if (selectedPath) {
        return insertStmt(program, selectedFunction, selectedPath, 'after', createStmt(kind))
      }
      const fn = program.functions.find(
        (item) => item.name.toLowerCase() === selectedFunction.toLowerCase(),
      )
      if (!fn) return program
      return {
        ...program,
        functions: program.functions.map((item) =>
          item === fn ? { ...item, body: [...item.body, createStmt(kind)] } : item,
        ),
      }
    })
    select(null)
  }

  const needle = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      INSERTABLE.filter(
        (item) =>
          !needle ||
          item.label.toLowerCase().includes(needle) ||
          item.hint.toLowerCase().includes(needle) ||
          SEARCH_TERMS[item.kind]?.includes(needle) ||
          item.kind.includes(needle),
      ),
    [needle],
  )

  function renderItem(kind: StmtKind) {
    const item = INSERTABLE.find((entry) => entry.kind === kind)
    if (!item) return null
    const category = categoryForKind(kind)
    return (
      <button
        key={item.kind}
        type="button"
        draggable
        className={`palette__item palette__item--${category}`}
        title={`${item.label} — ${item.hint}. Drag onto a connector.`}
        aria-label={item.label}
        onClick={() => add(item.kind)}
        onDragStart={(event) => {
          event.dataTransfer.setData(BLOCK_DRAG_TYPE, item.kind)
          event.dataTransfer.effectAllowed = 'copy'
          remember(item.kind)
        }}
      >
        <span className={`palette__preview palette__preview--${category}`}>
          <BlockPreview kind={item.kind} />
        </span>
        <span className="palette__copy">
          <strong>{item.label}</strong>
          <small>{item.hint}</small>
        </span>
        <GripVertical className="palette__grip" size={14} aria-hidden="true" />
      </button>
    )
  }

  return (
    <aside className="palette" aria-label="Shape palette">
      <div className="palette__head">
        <div>
          <h2 className="palette__title">Insert</h2>
          <p className="palette__count">{INSERTABLE.length} blocks</p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="palette__close"
            aria-label="Hide shapes panel"
            title="Hide shapes panel"
            onClick={onClose}
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <label className="palette__search">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="Search blocks"
          aria-label="Search blocks"
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            type="button"
            className="palette__search-clear"
            aria-label="Clear search"
            onClick={() => setQuery('')}
          >
            <X size={12} aria-hidden="true" />
          </button>
        ) : null}
      </label>

      <p className="palette__hint">
        {selectedPath
          ? 'Click to add after the selected block. Drag any block onto a connector to place it exactly.'
          : 'Click to add at the end, or drag a block onto a connector to insert it there.'}
      </p>

      <div className="palette__scroll">
        {!needle && recent.length > 0 ? (
          <section className="palette__group">
            <h3 className="palette__group-title">
              <Sparkles size={11} aria-hidden="true" />
              Recent
            </h3>
            <div className="palette__list">{recent.map(renderItem)}</div>
          </section>
        ) : null}

        {GROUPS.map((group) => {
          const entries = filtered.filter((item) => group.kinds.includes(item.kind))
          if (entries.length === 0) return null
          return (
            <section className="palette__group" key={group.title}>
              <h3 className="palette__group-title">{group.title}</h3>
              <div className="palette__list">{entries.map((item) => renderItem(item.kind))}</div>
            </section>
          )
        })}

        {filtered.length === 0 ? (
          <p className="palette__empty">No block matches “{query.trim()}”.</p>
        ) : null}
      </div>

      <p className="palette__foot">
        <GripVertical size={13} aria-hidden="true" />
        Drag onto a connector, or click a line to insert a block there.
      </p>
    </aside>
  )
}
