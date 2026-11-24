import { useSyncExternalStore } from 'react'
import { id } from './id'
import { en } from './en'

export type Language = 'id' | 'en'

const dictionaries = { id, en }
let language: Language = 'id'
const listeners = new Set<() => void>()

export function t(key: string): string {
  return dictionaries[language][key] ?? key
}

export function getLanguage(): Language {
  return language
}

export function setLanguage(next: Language): void {
  language = next
  if (typeof localStorage !== 'undefined') localStorage.setItem('marcoflow.lang', next)
  listeners.forEach((listener) => listener())
}

export function useLanguage(): Language {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getLanguage,
    getLanguage,
  )
}

if (typeof localStorage !== 'undefined') {
  const saved = localStorage.getItem('marcoflow.lang')
  if (saved === 'id' || saved === 'en') language = saved
}
