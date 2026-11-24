import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
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
    const saved = await putProject(createProjectRecord('Proyek Baru'))
    await refresh()
    navigate(`/editor/${saved.id}`)
  }

  async function handleImport(file: File): Promise<void> {
    const text = await file.text()
    const parsed = parseFprg(text)
    if (!parsed.ok) {
      setMessage(`Import gagal: ${parsed.error}`)
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
    const next = window.prompt('Nama project', record.program.meta.name)
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
    if (!window.confirm(`Hapus "${record.program.meta.name}"?`)) return
    await deleteProject(record.id)
    await refresh()
  }

  return (
    <section className="hub">
      <header className="hub__head">
        <div>
          <h1>Proyek kamu</h1>
          <p className="hub__subtitle">Semua proyek tersimpan di browser ini.</p>
        </div>
        <div className="hub__actions">
          <ImportButton onFile={(file) => void handleImport(file)} />
          <button type="button" className="button button--primary" onClick={() => void handleNew()}>
            <Plus size={16} aria-hidden="true" />
            Proyek baru
          </button>
        </div>
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
        <p className="hub__loading">Memuat proyek…</p>
      ) : projects.length === 0 ? (
        <div className="hub__empty">
          <p>Belum ada proyek. Buat baru atau buka contoh.</p>
          <button type="button" className="button button--primary" onClick={() => void handleNew()}>
            Mulai proyek pertama
          </button>
        </div>
      ) : (
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
      )}

      <SampleGallery />
    </section>
  )
}
