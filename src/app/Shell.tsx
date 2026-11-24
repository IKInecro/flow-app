import { Outlet } from 'react-router-dom'
import { DesktopGate } from './DesktopGate'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'

export function Shell() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell__main">
        <main className="shell__content">
          <DesktopGate>
            <Outlet />
          </DesktopGate>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
