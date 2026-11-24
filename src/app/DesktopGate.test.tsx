import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { DesktopGate } from './DesktopGate'

function mockWidth(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows the desktop notice on a narrow viewport', () => {
  mockWidth(false)
  render(
    <DesktopGate>
      <div>isi editor</div>
    </DesktopGate>,
  )

  expect(screen.getByRole('status')).toHaveTextContent(/desktop/i)
  expect(screen.queryByText('isi editor')).not.toBeInTheDocument()
})

test('renders children on a desktop viewport', () => {
  mockWidth(true)
  render(
    <DesktopGate>
      <div>isi editor</div>
    </DesktopGate>,
  )

  expect(screen.getByText('isi editor')).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
