import { useRef, useState, type ChangeEvent } from 'react'
import { FileDown, FileUp, ImageDown, Download } from 'lucide-react'
import { parseFprg } from '../../../core/fprg/parse'
import { Toast } from '../../../shared/ui/Toast'
import { useProjectStore } from '../store/projectStore'
import { exportPng } from './exportPng'
import { exportSvg } from './exportSvg'
import { downloadFprg, fprgFilename } from './files'

interface Notice {
  kind: 'success' | 'error'
  text: string
}

export function FileMenu() {
  const program = useProjectStore((state) => state.program)
  const commit = useProjectStore((state) => state.commit)
  const [notice, setNotice] = useState<Notice | null>(null)
  const details = useRef<HTMLDetailsElement | null>(null)
  const input = useRef<HTMLInputElement | null>(null)

  const base = program ? fprgFilename(program).replace(/\.fprg$/i, '') : 'flowchart'

  function close(): void {
    details.current?.removeAttribute('open')
  }

  async function readFile(file: File | undefined): Promise<void> {
    if (!file) return
    if (!/\.fprg$/i.test(file.name)) {
      setNotice({ kind: 'error', text: 'The file must have a .fprg extension.' })
      return
    }
    try {
      const text = await file.text()
      const parsed = parseFprg(text)
      if (!parsed.ok) {
        setNotice({ kind: 'error', text: parsed.error })
        return
      }
      commit(() => parsed.program)
      const extra = parsed.warnings.length
        ? ` (${parsed.warnings.length} warning${parsed.warnings.length === 1 ? '' : 's'})`
        : ''
      setNotice({ kind: 'success', text: `Project imported${extra}.` })
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Could not read the file.',
      })
    }
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>): void {
    void readFile(event.target.files?.[0])
    event.target.value = ''
  }

  async function exportImage(kind: 'png' | 'svg'): Promise<void> {
    const element = document.querySelector<HTMLElement>('.canvas')
    if (!element) {
      setNotice({ kind: 'error', text: 'The canvas is not ready to export.' })
      return
    }
    try {
      if (kind === 'svg') exportSvg(element, `${base}.svg`)
      else await exportPng(element, `${base}.png`)
      setNotice({ kind: 'success', text: `${kind.toUpperCase()} image downloaded.` })
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Could not export the image.',
      })
    }
  }

  return (
    <>
      <details className="file-menu" ref={details}>
        <summary className="button button--ghost file-menu__trigger" aria-label="File menu">
          <FileDown size={16} aria-hidden="true" />
          File
        </summary>
        <div className="file-menu__list" role="menu" aria-label="File actions">
          <button type="button" role="menuitem" onClick={() => input.current?.click()}>
            <FileUp size={15} aria-hidden="true" />
            Import .fprg
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!program}
            onClick={() => {
              if (program) downloadFprg(program, `${base}.fprg`)
              close()
            }}
          >
            <Download size={15} aria-hidden="true" />
            Export .fprg
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!program}
            onClick={() => {
              void exportImage('png')
              close()
            }}
          >
            <ImageDown size={15} aria-hidden="true" />
            Export PNG
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!program}
            onClick={() => {
              exportImage('svg')
              close()
            }}
          >
            <ImageDown size={15} aria-hidden="true" />
            Export SVG
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept=".fprg"
          hidden
          aria-label="Project file"
          onChange={onUpload}
        />
      </details>
      {notice ? (
        <div className="file-menu__toast">
          <Toast kind={notice.kind}>{notice.text}</Toast>
        </div>
      ) : null}
    </>
  )
}
