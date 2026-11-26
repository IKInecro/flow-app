import { useEffect, useState } from 'react'
import { Check, Database, Keyboard, Monitor, Moon, Sun } from 'lucide-react'
import { getStorageStatus, getStorageWarning, listProjects } from '../../shared/storage/projects'
import { useTheme, type Theme } from '../../shared/theme/theme'

const THEMES: { value: Theme; label: string; hint: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', hint: 'Porcelain, navy ink', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Deep navy, soft ink', icon: Moon },
  { value: 'system', label: 'System', hint: 'Follow your device', icon: Monitor },
]

const SHORTCUTS = [
  { keys: 'Ctrl K', action: 'Open quick commands' },
  { keys: 'F5', action: 'Run the program' },
  { keys: 'F10', action: 'Step one statement' },
  { keys: 'Ctrl S', action: 'Export .fprg' },
  { keys: 'Ctrl Z', action: 'Undo' },
  { keys: 'Ctrl Shift Z', action: 'Redo' },
  { keys: 'Delete', action: 'Remove the selected node' },
  { keys: 'Esc', action: 'Close a dialog, deselect, or stop a run' },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [count, setCount] = useState<number | null>(null)
  const warning = getStorageWarning()
  const storage = getStorageStatus()

  useEffect(() => {
    let live = true
    void listProjects().then((projects) => {
      if (live) setCount(projects.length)
    })
    return () => {
      live = false
    }
  }, [])

  return (
    <section className="page settings">
      <header className="settings__head">
        <h1>Settings</h1>
        <p className="settings__lede">
          Personalize how MarcoFlow looks. Nothing here leaves this browser.
        </p>
      </header>

      <div className="settings__grid">
        <section className="settings__card" aria-labelledby="settings-appearance">
          <div className="settings__card-head">
            <h2 id="settings-appearance">Appearance</h2>
            <span className="settings__meta">Saved on this device</span>
          </div>
          <div className="theme-grid" role="radiogroup" aria-label="Theme">
            {THEMES.map((option) => {
              const Icon = option.icon
              const active = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`theme-card ${active ? 'is-active' : ''}`}
                  onClick={() => setTheme(option.value)}
                >
                  <span className="theme-card__preview" data-preview={option.value} aria-hidden="true">
                    <span className="theme-card__rail" />
                    <span className="theme-card__sheet">
                      <span />
                      <span />
                    </span>
                  </span>
                  <span className="theme-card__label">
                    <Icon size={15} aria-hidden="true" />
                    {option.label}
                    {active ? <Check size={14} className="theme-card__check" aria-hidden="true" /> : null}
                  </span>
                  <span className="theme-card__hint">{option.hint}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="settings__card" aria-labelledby="settings-storage">
          <div className="settings__card-head">
            <h2 id="settings-storage">Storage</h2>
            <span className={`settings__badge ${storage === 'ok' ? 'is-ok' : 'is-warn'}`}>
              {storage === 'ok' ? 'Local' : 'Memory only'}
            </span>
          </div>
          <div className="settings__row">
            <Database size={18} aria-hidden="true" />
            <div>
              <strong>{count === null ? 'Counting projects…' : `${count} project${count === 1 ? '' : 's'}`}</strong>
              <p>Projects, view state, and settings live in IndexedDB and local storage.</p>
            </div>
          </div>
          {warning ? (
            <p className="settings__warning" role="status">
              {warning}
            </p>
          ) : (
            <p className="settings__note">
              Export a <code>.fprg</code> file from the editor to keep a portable backup.
            </p>
          )}
        </section>

        <section className="settings__card settings__card--wide" aria-labelledby="settings-keys">
          <div className="settings__card-head">
            <h2 id="settings-keys">Keyboard</h2>
            <Keyboard size={16} className="settings__head-icon" aria-hidden="true" />
          </div>
          <ul className="shortcut-list">
            {SHORTCUTS.map((item) => (
              <li key={item.keys}>
                <kbd>{item.keys}</kbd>
                <span>{item.action}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="settings__card settings__card--wide" aria-labelledby="settings-about">
          <div className="settings__card-head">
            <h2 id="settings-about">About</h2>
            <span className="settings__meta">v0.1.0</span>
          </div>
          <p>
            MarcoFlow is a static, offline-first flowchart editor. Draw a flow, run it step by
            step, and read the generated source in 27 languages. No account, no server, no
            tracking.
          </p>
        </section>
      </div>
    </section>
  )
}
