import type { ReactNode } from 'react'
import { useTheme } from '../shared/theme/theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  useTheme()
  return <>{children}</>
}
