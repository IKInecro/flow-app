import { createStmt, insertStmt } from '../../../core/model/program'
import type { StmtKind } from '../../../core/model/types'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { INSERTABLE } from '../canvas/InsertMenu'

export function ShapePalette() {
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
    <aside className="palette" aria-label="Palet bentuk">
      <h2 className="palette__title">Sisipkan</h2>
      <p className="palette__hint">
        Klik untuk menambah{selectedPath ? ' setelah node terpilih' : ' di akhir blok'}.
      </p>
      <div className="palette__grid">
        {INSERTABLE.map((item) => (
          <button
            key={item.kind}
            type="button"
            className="palette__item"
            title={item.hint}
            aria-label={item.label}
            onClick={() => add(item.kind)}
          >
            <span className={`palette__glyph palette__glyph--${item.kind}`} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
