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
  { kind: 'declare', label: 'Declare', hint: 'Declare a variable' },
  { kind: 'assign', label: 'Assign', hint: 'Set a variable' },
  { kind: 'input', label: 'Input', hint: 'Read from the user' },
  { kind: 'output', label: 'Output', hint: 'Show a value' },
  { kind: 'if', label: 'If', hint: 'Branching' },
  { kind: 'while', label: 'While', hint: 'Loop while a condition holds' },
  { kind: 'do', label: 'Do', hint: 'Loop at least once' },
  { kind: 'for', label: 'For', hint: 'Loop with a counter' },
  { kind: 'call', label: 'Call', hint: 'Call a function' },
  { kind: 'comment', label: 'Comment', hint: 'Leave a note' },
  { kind: 'breakpoint', label: 'Breakpoint', hint: 'Pause while debugging' },
]

export function InsertMenu({ target, onInsert, onClose }: InsertMenuProps): ReactNode {
  return (
    <div className="insert-menu" role="menu" aria-label={`Insert node at ${target.path || 'start'}`}>
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
