import { ArrowDownToLine, ArrowUpToLine, CornerDownRight, Pencil, Trash2 } from 'lucide-react'
import type { InsertPosition } from '../../../core/model/program'
import type { Stmt } from '../../../core/model/types'

interface Props {
  kind: string
  stmt: Stmt | null
  onInsert: (position: InsertPosition) => void
  onEdit: () => void
  onDelete: () => void
}

export function ShapeToolbar({ kind, stmt, onInsert, onEdit, onDelete }: Props) {
  const canBranch = kind === 'if'
  const canNest = kind === 'if' || kind === 'while' || kind === 'do' || kind === 'for'

  return (
    <div className="node-toolbar" role="toolbar" aria-label="Aksi node">
      <button
        type="button"
        className="node-toolbar__button"
        title="Sisipkan sebelum"
        aria-label="Sisipkan sebelum"
        onClick={() => onInsert('before')}
      >
        <ArrowUpToLine size={15} />
      </button>
      <button
        type="button"
        className="node-toolbar__button"
        title="Sisipkan sesudah"
        aria-label="Sisipkan sesudah"
        onClick={() => onInsert('after')}
      >
        <ArrowDownToLine size={15} />
      </button>
      {canNest ? (
        <button
          type="button"
          className="node-toolbar__button"
          title="Sisipkan ke dalam"
          aria-label="Sisipkan ke dalam"
          onClick={() => onInsert(canBranch ? 'into-then' : 'into-body')}
        >
          <CornerDownRight size={15} />
        </button>
      ) : null}
      {stmt && stmt.kind !== 'unsupported' ? (
        <button
          type="button"
          className="node-toolbar__button"
          title="Edit node"
          aria-label="Edit node"
          onClick={onEdit}
        >
          <Pencil size={15} />
        </button>
      ) : null}
      {stmt ? (
        <button
          type="button"
          className="node-toolbar__button node-toolbar__button--danger"
          title="Hapus node"
          aria-label="Hapus node"
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </button>
      ) : null}
    </div>
  )
}
