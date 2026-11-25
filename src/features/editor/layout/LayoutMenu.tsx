import { Check, LayoutPanelLeft, PanelBottom, PanelLeft, PanelRight, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useUiStore } from '../store/uiStore'

export function LayoutMenu() {
  const paletteOpen = useUiStore((state) => state.paletteOpen)
  const sideOpen = useUiStore((state) => state.sideOpen)
  const consoleOpen = useUiStore((state) => state.consoleOpen)
  const togglePalette = useUiStore((state) => state.togglePalette)
  const toggleSide = useUiStore((state) => state.toggleSide)
  const toggleConsole = useUiStore((state) => state.toggleConsole)
  const resetLayout = useUiStore((state) => state.resetLayout)

  const items = [
    {
      label: 'Shapes panel',
      icon: PanelLeft,
      checked: paletteOpen,
      onSelect: togglePalette,
    },
    {
      label: 'Right panel',
      icon: PanelRight,
      checked: sideOpen,
      onSelect: toggleSide,
    },
    {
      label: 'Console',
      icon: PanelBottom,
      checked: consoleOpen,
      onSelect: toggleConsole,
    },
  ]

  return (
    <details className="file-menu layout-menu">
      <summary className="button button--ghost file-menu__trigger" aria-label="Layout menu">
        <SlidersHorizontal size={16} aria-hidden="true" />
        Layout
      </summary>
      <div className="file-menu__list layout-menu__list" role="menu" aria-label="Panel layout">
        <p className="layout-menu__heading">
          <LayoutPanelLeft size={13} aria-hidden="true" />
          Visible panels
        </p>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitemcheckbox"
            aria-checked={item.checked}
            className="layout-menu__item"
            onClick={item.onSelect}
          >
            <item.icon size={15} aria-hidden="true" />
            <span>{item.label}</span>
            {item.checked ? <Check size={14} className="layout-menu__check" aria-hidden="true" /> : null}
          </button>
        ))}
        <button type="button" role="menuitem" className="layout-menu__item" onClick={resetLayout}>
          <RotateCcw size={15} aria-hidden="true" />
          <span>Reset layout</span>
        </button>
      </div>
    </details>
  )
}
