import type { ReactNode } from 'react'
import type { InsertPosition } from '../../../core/model/program'
import type { StmtKind } from '../../../core/model/types'

export interface InsertTarget {
  functionName: string
  path: string
  position: InsertPosition
}

export interface InsertMenuProps {
  target: InsertTarget
  onInsert: (kind: StmtKind, position: InsertPosition) => void
  onClose?: () => void
}

export const INSERTABLE: { kind: StmtKind; label: string; hint: string }[] = [
  { kind: 'declare', label: 'Declare', hint: 'Deklarasi variabel' },
  { kind: 'assign', label: 'Assign', hint: 'Isi variabel' },
  { kind: 'input', label: 'Input', hint: 'Baca dari pengguna' },
  { kind: 'output', label: 'Output', hint: 'Tampilkan nilai' },
  { kind: 'if', label: 'If', hint: 'Percabangan' },
  { kind: 'while', label: 'While', hint: 'Loop selama kondisi' },
  { kind: 'do', label: 'Do', hint: 'Loop minimal sekali' },
  { kind: 'for', label: 'For', hint: 'Loop dengan counter' },
  { kind: 'call', label: 'Call', hint: 'Panggil function' },
  { kind: 'comment', label: 'Comment', hint: 'Catatan' },
  { kind: 'breakpoint', label: 'Breakpoint', hint: 'Berhenti saat debug' },
]

export function InsertMenu({ target, onInsert, onClose }: InsertMenuProps): ReactNode {
  return (
    <div className="insert-menu" role="menu" aria-label={`Sisipkan node pada ${target.path || 'awal'}`}>
      {INSERTABLE.map((item) => (
        <button
          key={item.kind}
          type="button"
          role="menuitem"
          className="insert-menu__item"
          title={item.hint}
          onClick={() => {
            onInsert(item.kind, target.position)
            onClose?.()
          }}
        >
          <span className={`insert-menu__dot insert-menu__dot--${item.kind}`} aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </div>
  )
}
