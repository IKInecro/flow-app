import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export interface ToastProps {
  kind?: 'info' | 'success' | 'error'
  children: ReactNode
}

export function Toast({ kind = 'info', children }: ToastProps) {
  return (
    <p
      className={`ui-toast ui-toast--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {kind === 'success' ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
      {kind === 'error' ? <AlertTriangle size={14} aria-hidden="true" /> : null}
      <span>{children}</span>
    </p>
  )
}
