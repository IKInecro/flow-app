import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, Redo2, Undo2 } from 'lucide-react'
import { formatStmt, findStmt } from '../../core/model/program'
import {
  createProjectRecord,
  getProject,
  getStorageWarning,
  putProject,
} from '../../shared/storage/projects'
import { FlowCanvas } from './canvas/FlowCanvas'
import { ShapePalette } from './palette/ShapePalette'
import { useProjectStore } from './store/projectStore'
import { useUiStore } from './store/uiStore'

const SAVE_LABEL: Record<string, string> = {
  idle: 'Belum disimpan',
  saving: 'Menyimpan…',
  saved: 'Tersimpan',
  error: 'Gagal menyimpan',
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const load = useProjectStore((state) => state.load)
  const program = useProjectStore((state) => state.program)
  const saveState = useProjectStore((state) => state.saveState)
  const undo = useProjectStore((state) => state.undo)
  const redo = useProjectStore((state) => state.redo)
  const canUndo = useProjectStore((state) => state.canUndo)
  const canRedo = useProjectStore((state) => state.canRedo)
  const clearOffsets = useProjectStore((state) => state.clearOffsets)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const selectedPath = useUiStore((state) => state.selectedPath)
  const setSelectedFunction = useUiStore((state) => state.setSelectedFunction)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function open(): Promise<void> {
      setLoading(true)
      setError(null)
      if (!id || id === 'new') {
        const saved = await putProject(createProjectRecord('Proyek Baru'))
        if (cancelled) return
        navigate(`/editor/${saved.id}`, { replace: true })
        return
      }
      const record = await getProject(id)
      if (cancelled) return
      if (!record) {
        setError('Proyek tidak ditemukan. Mungkin sudah dihapus dari browser ini.')
        setLoading(false)
        return
      }
      load(record)
      setSelectedFunction(record.program.functions[0]?.name ?? 'Main')
      setLoading(false)
    }
    void open()
    return () => {
      cancelled = true
    }
  }, [id, load, navigate, setSelectedFunction])

  const selected =
    program && selectedPath ? (findStmt(program, selectedFunction, selectedPath)?.stmt ?? null) : null
  const warning = getStorageWarning()

  if (loading) {
    return (
      <section className="editor">
        <p className="editor__status">Membuka proyek…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="editor">
        <div className="editor__error" role="alert">
          <p>{error}</p>
          <Link className="button" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Kembali ke proyek
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="editor">
      <header className="editor__bar">
        <Link className="icon-button" to="/" aria-label="Kembali ke proyek" title="Kembali">
          <ArrowLeft size={18} />
        </Link>
        <div className="editor__title">
          <strong>{program?.meta.name || 'Tanpa judul'}</strong>
          <span className={`editor__save editor__save--${saveState}`}>{SAVE_LABEL[saveState]}</span>
        </div>
        <div className="editor__actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 size={18} />
          </button>
          <button
            type="button"
            className="button button--ghost"
            title="Kembali ke auto-layout"
            onClick={clearOffsets}
          >
            <LayoutGrid size={16} aria-hidden="true" />
            Auto-layout
          </button>
        </div>
      </header>

      {warning ? (
        <div className="banner banner--warning editor__banner" role="status">
          {warning}
        </div>
      ) : null}

      <div className="editor__body">
        <ShapePalette />
        <FlowCanvas />
        <aside className="inspector" aria-label="Inspector">
          <h2 className="inspector__title">Properti</h2>
          {selected ? (
            <div className="inspector__content">
              <p className="inspector__kind">{selected.kind}</p>
              <pre className="inspector__preview">{formatStmt(selected)}</pre>
              <p className="inspector__hint">Form edit lengkap ada di tahap inspector.</p>
            </div>
          ) : (
            <p className="inspector__hint">
              Pilih node di kanvas untuk melihat propertinya.
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}

