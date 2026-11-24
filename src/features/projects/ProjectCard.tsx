import { Link } from 'react-router-dom'
import { ArrowUpRight, Copy, Pencil, Trash2 } from 'lucide-react'
import type { ProjectRecord } from '../../shared/storage/projects'

interface Props {
  record: ProjectRecord
  onRename: (record: ProjectRecord) => void
  onDuplicate: (record: ProjectRecord) => void
  onDelete: (record: ProjectRecord) => void
}

const ROUTES = [
  'M28 96V64a8 8 0 0 1 8-8h56a8 8 0 0 0 8-8V28h112',
  'M28 92h48a8 8 0 0 0 8-8V60a8 8 0 0 1 8-8h72a8 8 0 0 1 8 8v16a8 8 0 0 0 8 8h32',
  'M28 32h52a8 8 0 0 1 8 8v20a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V40a8 8 0 0 1 8-8h36',
]

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

function routeFor(record: ProjectRecord): string {
  const seed = [...record.id].reduce((total, char) => total + char.charCodeAt(0), 0)
  return ROUTES[seed % ROUTES.length]
}

export function ProjectCard({ record, onRename, onDuplicate, onDelete }: Props) {
  const name = record.program.meta.name || 'Tanpa judul'
  return (
    <article className="project-card">
      <Link to={`/editor/${record.id}`} className="project-card__main" aria-label={`Buka ${name}`}>
        <div className="project-card__preview" aria-hidden="true">
          <svg viewBox="0 0 240 120" className="project-card__route">
            <path className="project-card__path" d={routeFor(record)} />
            <circle className="project-card__stop project-card__stop--start" cx="28" cy="96" r="5" />
            <circle className="project-card__stop" cx="100" cy="48" r="4.5" />
            <circle className="project-card__stop project-card__stop--accent" cx="188" cy="28" r="4.5" />
            <circle className="project-card__stop project-card__stop--end" cx="220" cy="28" r="3" />
          </svg>
          <span className="project-card__open" aria-hidden="true">
            <ArrowUpRight size={15} />
          </span>
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
