import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardDrive, Plus } from 'lucide-react'
import { parseFprg } from '../../core/fprg/parse'
import {
  createProjectRecord,
  deleteProject,
  duplicateProject,
  getStorageWarning,
  listProjects,
  putProject,
  type ProjectRecord,
} from '../../shared/storage/projects'
import { ImportButton } from './ImportButton'
import { ProjectCard } from './ProjectCard'
import { SampleGallery } from './SampleGallery'

function RouteArt() {
  return (
    <svg viewBox="0 0 420 240" className="hub__route" aria-hidden="true">
      <path className="hub__route-line hub__route-line--blue" d="M34 196h78V128h84" />
      <path className="hub__route-line hub__route-line--amber" d="M34 92h72v36h84V64h86" />
      <path className="hub__route-line hub__route-line--coral" d="M34 196h52v-54h76v-46h96v72h128" />
      <circle className="hub__stop hub__stop--blue" cx="196" cy="128" r="6" />
      <circle className="hub__stop hub__stop--amber" cx="276" cy="64" r="6" />
      <circle className="hub__stop hub__stop--coral" cx="162" cy="142" r="7" />
      <circle className="hub__stop hub__stop--coral" cx="258" cy="96" r="7" />
      <circle className="hub__stop hub__stop--coral" cx="354" cy="168" r="7" />
      <circle className="hub__stop hub__stop--end" cx="386" cy="168" r="4" />
    </svg>
  )
}

export function ProjectHub() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(getStorageWarning())

  async function refresh(): Promise<void> {
    setProjects(await listProjects())
    setWarning(getStorageWarning())
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleNew(): Promise<void> {
    const saved = await putProject(createProjectRecord('New Project'))
    await refresh()
    navigate(`/editor/${saved.id}`)
  }

  async function handleImport(file: File): Promise<void> {
    const text = await file.text()
    const parsed = parseFprg(text)
    if (!parsed.ok) {
      setMessage(`Import failed: ${parsed.error}`)
      return
    }
    const name = parsed.program.meta.name || file.name.replace(/\.fprg$/i, '') || 'Import'
    const record = createProjectRecord(name)
    record.program = parsed.program
    const saved = await putProject(record)
    setMessage(null)
    await refresh()
    navigate(`/editor/${saved.id}`)
  }

  async function handleRename(record: ProjectRecord): Promise<void> {
    const next = window.prompt('Project name', record.program.meta.name)
    if (!next?.trim()) return
    record.program.meta.name = next.trim()
    await putProject(record)
    await refresh()
  }

  async function handleDuplicate(record: ProjectRecord): Promise<void> {
    await duplicateProject(record.id)
    await refresh()
  }

  async function handleDelete(record: ProjectRecord): Promise<void> {
    if (!window.confirm(`Delete "${record.program.meta.name}"?`)) return
    await deleteProject(record.id)
    await refresh()
  }

  return (
    <section className="hub">
      <header className="hub__hero">
        <div className="hub__intro">
          <h1>Your projects</h1>
          <p className="hub__subtitle">
            Draw the flow, run it step by step, then read the code. Everything is stored in this browser.
          </p>
          <div className="hub__chips" aria-label="Storage status">
            <span className="hub__chip">
              <HardDrive size={13} aria-hidden="true" />
              Local, no account
            </span>
            <span className="hub__chip hub__chip--quiet">
              {loading ? 'Loading…' : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
            </span>
          </div>
          <div className="hub__actions">
            <button type="button" className="button button--primary" onClick={() => void handleNew()}>
              <Plus size={16} aria-hidden="true" />
              New project
            </button>
            <ImportButton onFile={(file) => void handleImport(file)} />
          </div>
        </div>
        <RouteArt />
      </header>

      {warning ? (
        <div className="banner banner--warning" role="status">
          {warning}
        </div>
      ) : null}

      {message ? (
        <div className="toast toast--error" role="alert">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="hub__grid" aria-label="Loading projects">
          {[0, 1, 2].map((index) => (
            <div className="project-card project-card--skeleton" key={index} aria-hidden="true">
              <div className="project-card__preview" />
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line--short" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="hub__empty">
          <span className="hub__empty-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path d="M10 38V24a8 8 0 0 1 8-8h4a6 6 0 0 0 6-6V6" />
              <circle cx="10" cy="38" r="3.4" />
              <circle cx="28" cy="10" r="3.4" />
            </svg>
          </span>
          <p>No projects yet. Create one or open an example.</p>
          <button type="button" className="button button--primary" onClick={() => void handleNew()}>
            Start your first project
          </button>
        </div>
      ) : (
        <div className="hub__section">
          <div className="section-head">
            <h2>Recent</h2>
            <span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
          </div>
          <div className="hub__grid">
            {projects.map((record) => (
              <ProjectCard
                key={record.id}
                record={record}
                onRename={(item) => void handleRename(item)}
                onDuplicate={(item) => void handleDuplicate(item)}
                onDelete={(item) => void handleDelete(item)}
              />
            ))}
          </div>
        </div>
      )}

      <SampleGallery />
    </section>
  )
}
