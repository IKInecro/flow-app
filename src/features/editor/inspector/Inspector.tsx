import { findStmt, replaceStmt } from '../../../core/model/program'
import type { Stmt } from '../../../core/model/types'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { Problems } from './Problems'
import { StmtForm } from './forms'

export function Inspector() {
  const program = useProjectStore((state) => state.program)
  const commit = useProjectStore((state) => state.commit)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const selectedPath = useUiStore((state) => state.selectedPath)

  const found =
    program && selectedPath ? findStmt(program, selectedFunction, selectedPath) : null

  function save(stmt: Stmt): void {
    if (!selectedPath) return
    commit((current) => replaceStmt(current, selectedFunction, selectedPath, stmt))
  }

  return (
    <aside className="inspector" aria-label="Inspector">
      <h2 className="inspector__title">Properties</h2>

      {found ? (
        <>
          <p className="inspector__kind">{found.stmt.kind}</p>
          <p className="inspector__where">
            {selectedFunction} · {selectedPath}
          </p>
          <div className="inspector__form">
            <StmtForm stmt={found.stmt} onCommit={save} />
          </div>
        </>
      ) : (
        <p className="inspector__hint">Select a node on the canvas to see its properties.</p>
      )}

      <Problems />
    </aside>
  )
}
