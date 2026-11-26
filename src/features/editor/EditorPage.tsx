import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  LayoutGrid,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Terminal,
  Undo2,
} from 'lucide-react'
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
import { useSymbols } from './inspector/useSymbols'
import { CallStack } from '../run/CallStack'
import { ConsoleDock } from '../run/ConsoleDock'
import { VariableWatch } from '../run/VariableWatch'
import { ShapePalette } from './palette/ShapePalette'
import { LayoutMenu } from './layout/LayoutMenu'
import { PanelResizer } from './layout/PanelResizer'
import { useProjectStore } from './store/projectStore'
import { useUiStore } from './store/uiStore'

const SAVE_LABEL: Record<string, string> = {
  idle: 'Unsaved',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
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
  const paletteOpen = useUiStore((state) => state.paletteOpen)
  const sideOpen = useUiStore((state) => state.sideOpen)
  const consoleOpen = useUiStore((state) => state.consoleOpen)
  const paletteWidth = useUiStore((state) => state.paletteWidth)
  const sideWidth = useUiStore((state) => state.sideWidth)
  const setLayout = useUiStore((state) => state.setLayout)
  const togglePalette = useUiStore((state) => state.togglePalette)
  const toggleSide = useUiStore((state) => state.toggleSide)
  const toggleConsole = useUiStore((state) => state.toggleConsole)
  const symbols = useSymbols()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function open(): Promise<void> {
      setLoading(true)
      setError(null)
      if (!id || id === 'new') {
        const saved = await putProject(createProjectRecord('New Project'))
        if (cancelled) return
        navigate(`/editor/${saved.id}`, { replace: true })
        return
      }
      const record = await getProject(id)
      if (cancelled) return
      if (!record) {
        setError('Project not found. It may have been deleted from this browser.')
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
        <p className="editor__status">Opening project…</p>
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
            Back to projects
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section
      className="editor"
      style={
        {
          '--palette-w': `${paletteWidth}px`,
          '--side-w': `${sideWidth}px`,
        } as CSSProperties
      }
    >
      <header className="editor__bar">
        <Link className="icon-button" to="/" aria-label="Back to projects" title="Back">
          <ArrowLeft size={18} />
        </Link>
        <div className="editor__title">
          <strong>{program?.meta.name || 'Untitled'}</strong>
          <span className={`editor__save editor__save--${saveState}`}>{SAVE_LABEL[saveState]}</span>
        </div>
        <datalist id="mf-symbols">
          {symbols.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="editor__actions">
          <FileMenu />
          <LayoutMenu />
          <button
            type="button"
            className="icon-button"
            aria-label="Toggle console"
            title="Terminal"
            aria-pressed={consoleOpen}
            onClick={toggleConsole}
          >
            <Terminal size={17} />
          </button>
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
            title="Reset to auto layout"
            onClick={clearOffsets}
          >
            <LayoutGrid size={16} aria-hidden="true" />
            <span>Auto-layout</span>
          </button>
        </div>
      </header>

      {warning ? (
        <div className="banner banner--warning editor__banner" role="status">
          {warning}
        </div>
      ) : null}

      <div className={`editor__body ${inspectorTab === 'source' ? 'editor__body--source' : ''}`}>
        {paletteOpen ? (
          <>
            <ShapePalette onClose={togglePalette} />
            <PanelResizer
              orientation="vertical"
              value={paletteWidth}
              min={200}
              max={380}
              label="Resize shapes panel"
              onResize={(width) => setLayout({ paletteWidth: width })}
            />
          </>
        ) : (
          <button
            type="button"
            className="editor__reveal editor__reveal--left"
            aria-label="Show shapes panel"
            title="Show shapes panel"
            onClick={togglePalette}
          >
            <PanelLeftOpen size={16} aria-hidden="true" />
          </button>
        )}
        <FlowCanvas />
        {sideOpen ? (
          <>
            <PanelResizer
              orientation="vertical"
              value={sideWidth}
              min={250}
              max={460}
              invert
              label="Resize right panel"
              onResize={(width) => setLayout({ sideWidth: width })}
            />
            <div className="editor__side">
              <div className="editor__tabs" role="tablist" aria-label="Right panel">
                {(
                  [
                    ['properties', 'Node', 'Node properties'],
                    ['functions', 'Funcs', 'Functions'],
                    ['variables', 'Vars', 'Variables'],
                    ['callstack', 'Stack', 'Call stack'],
                    ['source', 'Code', 'Source code'],
                  ] as const
                ).map(([tab, label, title]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-label={title}
                    title={title}
                    aria-selected={inspectorTab === tab}
                    className={inspectorTab === tab ? 'is-active' : ''}
                    onClick={() => setInspectorTab(tab)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="editor__tabs-close"
                  aria-label="Hide right panel"
                  title="Hide right panel"
                  onClick={toggleSide}
                >
                  <PanelRightClose size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="editor__panel" key={inspectorTab}>
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
            </div>
          </>
        ) : (
          <button
            type="button"
            className="editor__reveal editor__reveal--right"
            aria-label="Show right panel"
            title="Show right panel"
            onClick={toggleSide}
          >
            <PanelRightOpen size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <ConsoleDock />
    </section>
  )
}

