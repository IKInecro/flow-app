import { useEffect, useState, type ReactNode } from 'react'
import { t } from '../shared/i18n'

function useIsDesktop(): boolean {
  const query = '(min-width: 768px)'
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const media = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  return matches
}

export function DesktopGate({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop()
  if (!desktop) {
    return (
      <div className="desktop-gate" role="status">
        <div className="desktop-gate__card">
          <h1>{t('gate.title')}</h1>
          <p>{t('gate.body')}</p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
