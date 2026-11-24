import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Code2,
  FolderKanban,
  Library,
  Settings,
  Variable,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { t, useLanguage } from '../shared/i18n'

type PanelId = 'variables' | 'source' | 'settings'

interface RailItem {
  to?: string
  panel?: PanelId
  label: string
  icon: LucideIcon
}

export function Sidebar() {
  useLanguage()
  const [panel, setPanel] = useState<PanelId | null>(null)

  const items: RailItem[] = [
    { to: '/', label: t('nav.projects'), icon: FolderKanban },
    { to: '/editor/new', label: t('nav.editor'), icon: Workflow },
    { to: '/examples', label: t('nav.examples'), icon: Library },
    { panel: 'variables', label: t('nav.variables'), icon: Variable },
    { panel: 'source', label: t('nav.source'), icon: Code2 },
    { panel: 'settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <>
      <nav className="rail" aria-label={t('nav.label')}>
        <NavLink to="/" className="rail__brand" aria-label={t('app.name')}>
          <span aria-hidden="true">M</span>
        </NavLink>
        <div className="rail__items">
          {items.map((item) =>
            item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                className="rail__item"
                aria-label={item.label}
                title={item.label}
              >
                <item.icon size={20} aria-hidden="true" />
                <span className="rail__text">{item.label}</span>
              </NavLink>
            ) : (
              <button
                key={item.label}
                type="button"
                className={`rail__item ${panel === item.panel ? 'is-active' : ''}`}
                aria-label={item.label}
                aria-pressed={panel === item.panel}
                title={item.label}
                onClick={() => setPanel((current) => (current === item.panel ? null : item.panel!))}
              >
                <item.icon size={20} aria-hidden="true" />
                <span className="rail__text">{item.label}</span>
              </button>
            ),
          )}
        </div>
      </nav>
      {panel ? (
        <aside className="panel" aria-label={t('nav.panel')}>
          <h2 className="panel__title">{t(`nav.${panel}`)}</h2>
          <p className="panel__hint">Panel ini aktif di dalam editor.</p>
        </aside>
      ) : null}
    </>
  )
}
