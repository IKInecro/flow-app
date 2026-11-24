import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'

export interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Dialog({ open, title, onClose, children, className = '' }: DialogProps) {
  const panel = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" onClick={onClose}>
      <div
        ref={panel}
        className={`dialog ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog__head">
          <h2>{title}</h2>
          <IconButton label="Tutup" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  )
}
