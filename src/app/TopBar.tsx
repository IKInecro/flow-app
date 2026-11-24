import { Moon, Sun } from 'lucide-react'
import { t } from '../shared/i18n'
import { useTheme } from '../shared/theme/theme'

export function TopBar() {
  const { resolved, setTheme } = useTheme()

  return (
    <header className="topbar">
      <div className="topbar__project">
        <span className="topbar__name">{t('top.untitled')}</span>
        <span className="topbar__saved">{t('top.saved')}</span>
      </div>
      <div className="topbar__actions">
        <button
          type="button"
          className="icon-button"
          aria-label={t('top.theme')}
          title={t('top.theme')}
          onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
        >
          {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
