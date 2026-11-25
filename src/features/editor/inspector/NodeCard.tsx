import { X } from 'lucide-react'
import { findStmt, replaceStmt } from '../../../core/model/program'
import type { Stmt } from '../../../core/model/types'
import { kindMeta } from '../canvas/nodeMeta'
import { useProjectStore } from '../store/projectStore'
import { StmtForm } from './forms'

interface NodeCardProps {
  functionName: string
  path: string
  onClose: () => void
}

export function NodeCard({ functionName, path, onClose }: NodeCardProps) {
  const program = useProjectStore((state) => state.program)
  const commit = useProjectStore((state) => state.commit)
  const found = program ? findStmt(program, functionName, path) : null

  if (!found) return null

  const meta = kindMeta(found.stmt.kind)
  const Icon = meta.icon

  function save(stmt: Stmt): void {
    commit((current) => replaceStmt(current, functionName, path, stmt))
  }

  return (
    <div className="node-card nodrag nowheel" role="dialog" aria-label="Block properties">
      <header className="node-card__head">
        <span className={`node-card__icon node-card__icon--${found.stmt.kind}`} aria-hidden="true">
          <Icon size={14} strokeWidth={2.2} />
        </span>
        <span className="node-card__title">
          <strong>{meta.label}</strong>
          <small>{path}</small>
        </span>
        <button
          type="button"
          className="node-card__close"
          aria-label="Close block properties"
          title="Close"
          onClick={onClose}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </header>
      <div className="node-card__form">
        <StmtForm stmt={found.stmt} onCommit={save} />
      </div>
    </div>
  )
}
