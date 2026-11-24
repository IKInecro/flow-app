import type { ReactNode } from 'react'

export interface TooltipProps {
  label: string
  children: ReactNode
  className?: string
}

export function Tooltip({ label, children, className = '' }: TooltipProps) {
  return (
    <span className={`tooltip ${className}`.trim()} data-tip={label} title={label}>
      {children}
    </span>
  )
}
