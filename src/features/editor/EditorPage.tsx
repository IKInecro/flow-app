import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, Redo2, Undo2 } from 'lucide-react'
import {
  createProjectRecord,
  getProject,
  getStorageWarning,
  putProject,
} from '../../shared/storage/projects'
import { FlowCanvas } from './canvas/FlowCanvas'
import { FunctionPanel } from './inspector/FunctionPanel'
import { Inspector } from './inspector/Inspector'
import { SourcePanel } from '../codegen/SourcePanel'
import { FileMenu } from './export/FileMenu'
import { useShortcuts } from './useShortcuts'
import { CallStack } from '../run/CallStack'
import { ConsoleDock } from '../run/ConsoleDock'
import { RunToolbar } from '../run/RunToolbar'
import { VariableWatch } from '../run/VariableWatch'
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
  useShortcuts()
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
  const inspectorTab = useUiStore((state) => state.inspectorTab)
  const setInspectorTab = useUiStore((state) => state.setInspectorTab)
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
          <FileMenu />
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

      <div className={`editor__body ${inspectorTab === 'source' ? 'editor__body--source' : ''}`}>
        <ShapePalette />
        <FlowCanvas />
        <div className="editor__side">
          <div className="editor__tabs" role="tablist" aria-label="Panel kanan">
            {(
              [
                ['properties', 'Properti'],
                ['functions', 'Function'],
                ['variables', 'Variabel'],
                ['callstack', 'Stack'],
                ['source', 'Kode'],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={inspectorTab === tab}
                className={inspectorTab === tab ? 'is-active' : ''}
                onClick={() => setInspectorTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>
          {inspectorTab === 'functions' ? (
            <FunctionPanel />
          ) : inspectorTab === 'variables' ? (
            <VariableWatch />
          ) : inspectorTab === 'callstack' ? (
            <CallStack />
          ) : inspectorTab === 'source' ? (
            <SourcePanel />
          ) : (
            <Inspector />
          )}
        </div>
        <RunToolbar />
      </div>
      <ConsoleDock />
    </section>
  )
}

