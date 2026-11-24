import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
} from '@codemirror/view'
import { Check, Copy, Download, Upload } from 'lucide-react'
import { generate } from '../../core/codegen/render'
import { stmtPathId } from '../../core/model/program'
import { getTemplate, importTemplate, listTemplates } from '../../core/templates'
import { useProjectStore } from '../editor/store/projectStore'
import { useUiStore } from '../editor/store/uiStore'
import { useRuntimeStore } from '../run/runtimeStore'

interface Toast {
  kind: 'ok' | 'error'
  text: string
}

function readFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('File tidak bisa dibaca.'))
    reader.readAsText(file)
  })
}

export function SourcePanel() {
  const program = useProjectStore((state) => state.program)
  const record = useProjectStore((state) => state.record)
  const setTemplateId = useProjectStore((state) => state.setTemplateId)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const activePath = useRuntimeStore((state) => state.activePath)
  const [version, setVersion] = useState(0)
  const [toast, setToast] = useState<Toast | null>(null)
  const host = useRef<HTMLDivElement | null>(null)
  const view = useRef<EditorView | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const templates = useMemo(() => listTemplates(), [version])
  const templateId = record?.templateId ?? 'python'
  const template = getTemplate(templateId)

  const rendered = useMemo(() => {
    if (!program || !template) return { code: '', lineMap: {} as Record<string, number[]> }
    return generate(program, template)
  }, [program, template])

  const key = activePath ? stmtPathId(selectedFunction, activePath) : null
  const activeLine = key ? rendered.lineMap[key]?.[0] : undefined

  const hasCodeView = Boolean(template && program)

  useEffect(() => {
    if (!hasCodeView || !host.current) return
    const state = EditorState.create({
      doc: rendered.code,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': { height: '100%', fontSize: '12px' },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            lineHeight: '1.55',
          },
        }),
      ],
    })
    view.current = new EditorView({ state, parent: host.current })
    return () => {
      view.current?.destroy()
      view.current = null
    }
  }, [hasCodeView])

  useEffect(() => {
    const editor = view.current
    if (!editor) return
    const current = editor.state.doc.toString()
    if (current !== rendered.code) {
      editor.dispatch({
        changes: { from: 0, to: current.length, insert: rendered.code },
      })
    }
  }, [rendered.code])

  useEffect(() => {
    const editor = view.current
    if (!editor || !activeLine) return
    const line = editor.state.doc.line(Math.min(activeLine, editor.state.doc.lines))
    editor.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
    })
  }, [activeLine, rendered.code])

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(rendered.code)
      setToast({ kind: 'ok', text: 'Kode disalin.' })
    } catch {
      setToast({ kind: 'error', text: 'Clipboard tidak tersedia di browser ini.' })
    }
  }

  function download(): void {
    if (typeof URL.createObjectURL !== 'function') {
      setToast({ kind: 'error', text: 'Browser tidak mendukung unduhan file.' })
      return
    }
    const blob = new Blob([rendered.code], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${program?.meta.name || 'program'}.${template?.extension || 'txt'}`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function upload(file: File | undefined): Promise<void> {
    if (!file) return
    try {
      const source = await readFile(file)
      if (!/\.fpgt$/i.test(file.name)) {
        setToast({ kind: 'error', text: 'File harus berekstensi .fpgt.' })
        return
      }
      const result = importTemplate(source)
      if (!result.ok) {
        setToast({ kind: 'error', text: result.error })
        return
      }
      setVersion((value) => value + 1)
      setTemplateId(result.template.id)
      setToast({ kind: 'ok', text: `Template "${result.template.template.language}" diimpor.` })
    } catch (error) {
      setToast({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Gagal membaca file.',
      })
    }
  }

  return (
    <section className="source" aria-label="Source code">
      <div className="source__bar">
        <label className="source__pick">
          <span>Bahasa</span>
          <select
            aria-label="Bahasa"
            value={templateId}
            onChange={(event) => {
              setTemplateId(event.target.value)
              setToast(null)
            }}
          >
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className="source__actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Salin kode"
            title="Salin kode"
            disabled={!rendered.code}
            onClick={() => void copy()}
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Unduh kode"
            title={`Unduh .${template?.extension || 'txt'}`}
            disabled={!rendered.code}
            onClick={download}
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Impor template"
            title="Impor template .fpgt"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={15} />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".fpgt"
            hidden
            aria-label="File template"
            onChange={(event) => {
              void upload(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
      </div>

      {toast ? (
        <p
          className={`source__toast source__toast--${toast.kind}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
        >
          {toast.kind === 'ok' ? <Check size={13} aria-hidden="true" /> : null}
          {toast.text}
        </p>
      ) : null}

      {!template ? (
        <p className="source__empty" role="alert">
          Template "{templateId}" tidak ditemukan. Pilih bahasa lain atau impor .fpgt.
        </p>
      ) : !program ? (
        <p className="source__empty">Buka proyek dulu untuk melihat kode.</p>
      ) : (
        <div className="source__code" ref={host} />
      )}
    </section>
  )
}
