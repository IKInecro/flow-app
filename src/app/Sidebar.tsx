import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  Command,
  FolderKanban,
  Library,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Workflow,
} from 'lucide-react'
import { t } from '../shared/i18n'
import { useTheme } from '../shared/theme/theme'
import { useUiStore } from '../features/editor/store/uiStore'

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="rail__mark">
      <path
        d="M7 25V15a5 5 0 0 1 5-5h4a4 4 0 0 0 4-4V4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M16 25h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="7" cy="25" r="3" fill="currentColor" />
      <circle cx="20" cy="10" r="2.6" fill="currentColor" />
      <circle cx="25" cy="25" r="3" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

export function Sidebar() {
  const { pathname } = useLocation()
  const { resolved, setTheme } = useTheme()
  const setCommandOpen = useUiStore((state) => state.setCommandOpen)
  const railCollapsed = useUiStore((state) => state.railCollapsed)
  const toggleRail = useUiStore((state) => state.toggleRail)
  const railNavOpen = useUiStore((state) => state.railNavOpen)
  const toggleRailNav = useUiStore((state) => state.toggleRailNav)

  const items = [
    { to: '/', label: t('nav.projects'), icon: FolderKanban, end: true, match: pathname === '/' },
    {
      to: '/editor/new',
      label: t('nav.editor'),
      icon: Workflow,
      end: false,
      match: pathname.startsWith('/editor'),
    },
    {
      to: '/examples',
      label: t('nav.examples'),
      icon: Library,
      end: false,
      match: pathname.startsWith('/examples'),
    },
    {
      to: '/settings',
      label: t('nav.settings'),
      icon: Settings,
      end: false,
      match: pathname.startsWith('/settings'),
    },
  ]

  return (
    <nav
      className={`rail ${railCollapsed ? 'rail--collapsed' : ''} ${railNavOpen ? '' : 'rail--nav-closed'}`}
      aria-label={t('nav.label')}
    >
      <NavLink to="/" className="rail__brand" aria-label={t('app.name')}>
        <BrandMark />
        <span className="rail__brandtext">
          <strong>{t('app.name')}</strong>
          <small>{t('app.tagline')}</small>
        </span>
      </NavLink>

      <div className="rail__items">
        <button
          type="button"
          className="rail__section-head"
          aria-expanded={railNavOpen}
          aria-label={railNavOpen ? 'Collapse navigation' : 'Expand navigation'}
          onClick={toggleRailNav}
        >
          <span>{t('nav.workspace')}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        {railNavOpen ? (
          <div className="rail__list">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`rail__item ${item.match ? 'is-active' : ''}`}
                aria-current={item.match ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
              >
                <item.icon size={19} aria-hidden="true" />
                <span className="rail__text">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rail__foot">
        <button
          type="button"
          className="rail__utility rail__collapse"
          aria-label={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={railCollapsed}
          onClick={toggleRail}
        >
          {railCollapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
          <span className="rail__text">{railCollapsed ? 'Expand' : 'Collapse'}</span>
        </button>
        <button
          type="button"
          className="rail__utility"
          aria-label={t('top.command')}
          title={t('top.command')}
          onClick={() => setCommandOpen(true)}
        >
          <Command size={18} aria-hidden="true" />
          <span className="rail__text">{t('nav.command')}</span>
          <kbd className="rail__kbd">⌘K</kbd>
        </button>
        <button
          type="button"
          className="rail__utility"
          aria-label={t('top.theme')}
          title={t('top.theme')}
          onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
        >
          {resolved === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          <span className="rail__text">{resolved === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </nav>
  )
}
