import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost'
  children?: ReactNode
}

export function Button({ variant = 'default', className = '', children, ...rest }: ButtonProps) {
  const variantClass = variant === 'default' ? '' : ` button--${variant}`
  return (
    <button type="button" className={`button${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
