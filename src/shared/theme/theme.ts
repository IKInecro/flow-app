import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'marcoflow.theme'
const listeners = new Set<() => void>()

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme
}

function storedTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system'
  const value = localStorage.getItem(STORAGE_KEY)
  return isTheme(value) ? value : 'system'
}

let current: Theme = storedTheme()

export function applyTheme(theme: Theme = current): void {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(theme)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}

export function getTheme(): Theme {
  return current
}

export function setTheme(theme: Theme): void {
  current = theme
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): { theme: Theme; resolved: ResolvedTheme; setTheme: (theme: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, getTheme, getTheme)
  return { theme, resolved: resolveTheme(theme), setTheme }
}

applyTheme(current)

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (current === 'system') applyTheme(current)
    listeners.forEach((listener) => listener())
  })
}
