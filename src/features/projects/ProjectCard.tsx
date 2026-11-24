import { Link } from 'react-router-dom'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import type { ProjectRecord } from '../../shared/storage/projects'

interface Props {
  record: ProjectRecord
  onRename: (record: ProjectRecord) => void
  onDuplicate: (record: ProjectRecord) => void
  onDelete: (record: ProjectRecord) => void
}

function nodeCount(record: ProjectRecord): number {
  return record.program.functions.reduce((total, fn) => total + fn.body.length, 0)
}

function updatedLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

export function ProjectCard({ record, onRename, onDuplicate, onDelete }: Props) {
  const name = record.program.meta.name || 'Tanpa judul'
  return (
    <article className="project-card">
      <Link to={`/editor/${record.id}`} className="project-card__main" aria-label={`Buka ${name}`}>
        <div className="project-card__preview" aria-hidden="true">
          <span className="project-card__shape project-card__shape--start" />
          <span className="project-card__shape" />
          <span className="project-card__shape project-card__shape--branch" />
          <span className="project-card__shape" />
        </div>
        <h3 className="project-card__name">{name}</h3>
        <p className="project-card__meta">
          {updatedLabel(record.updatedAt)} · {nodeCount(record)} node
        </p>
      </Link>
      <div className="project-card__actions">
        <button
          type="button"
          className="icon-button"
          aria-label={`Ganti nama ${name}`}
          title="Ganti nama"
          onClick={() => onRename(record)}
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={`Duplikat ${name}`}
          title="Duplikat"
          onClick={() => onDuplicate(record)}
        >
          <Copy size={16} />
        </button>
        <button
          type="button"
          className="icon-button icon-button--danger"
          aria-label={`Hapus ${name}`}
          title="Hapus"
          onClick={() => onDelete(record)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  )
}
