import { X } from 'lucide-react'
import { createStmt, insertStmt } from '../../../core/model/program'
import type { StmtKind } from '../../../core/model/types'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { INSERTABLE } from '../canvas/InsertMenu'
import { kindMeta } from '../canvas/nodeMeta'

const GROUPS: { title: string; kinds: StmtKind[] }[] = [
  { title: 'Values', kinds: ['declare', 'assign', 'input', 'output'] },
  { title: 'Control flow', kinds: ['if', 'while', 'do', 'for'] },
  { title: 'Extras', kinds: ['call', 'comment', 'breakpoint'] },
]

function categoryOf(kind: StmtKind): string {
  if (kind === 'if' || kind === 'while' || kind === 'do' || kind === 'for') return 'branch'
  if (kind === 'comment') return 'note'
  if (kind === 'breakpoint') return 'break'
  return 'action'
}

export function ShapePalette({ onClose }: { onClose?: () => void }) {
  const commit = useProjectStore((state) => state.commit)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const selectedPath = useUiStore((state) => state.selectedPath)
  const select = useUiStore((state) => state.select)

  function add(kind: StmtKind): void {
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

      <p className="palette__hint">
        {selectedPath
          ? 'Adds after the selected block.'
          : 'Adds at the end of this function.'}
      </p>

      {GROUPS.map((group) => {
        const entries = INSERTABLE.filter((item) => group.kinds.includes(item.kind))
        if (entries.length === 0) return null
        return (
          <section className="palette__group" key={group.title}>
            <h3 className="palette__group-title">{group.title}</h3>
            <div className="palette__list">
              {entries.map((item) => {
                const meta = kindMeta(item.kind)
                const Icon = meta.icon
                return (
                  <button
                    key={item.kind}
                    type="button"
                    className={`palette__item palette__item--${categoryOf(item.kind)}`}
                    title={item.hint}
                    aria-label={item.label}
                    onClick={() => add(item.kind)}
                  >
                    <span className="palette__icon" aria-hidden="true">
                      <Icon size={15} strokeWidth={2.2} />
                    </span>
                    <span className="palette__copy">
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      <p className="palette__foot">
        Tip: pick a block on the canvas to insert relative to it.
      </p>
    </aside>
  )
}
