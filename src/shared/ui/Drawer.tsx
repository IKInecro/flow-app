import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'

export interface DrawerProps {
  open: boolean
  title: string
  side?: 'left' | 'right'
  onClose: () => void
  children: ReactNode
}

export function Drawer({ open, title, side = 'right', onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" onClick={onClose}>
      <aside
        className={`drawer drawer--${side}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog__head">
          <h2>{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        {children}
      </aside>
    </div>
  )
}
