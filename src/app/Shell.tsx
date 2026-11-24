import { Outlet } from 'react-router-dom'
import { DesktopGate } from './DesktopGate'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function Shell() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell__main">
        <TopBar />
        <main className="shell__content">
          <DesktopGate>
            <Outlet />
          </DesktopGate>
        </main>
      </div>
    </div>
  )
}
