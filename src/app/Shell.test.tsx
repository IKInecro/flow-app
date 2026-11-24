import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Shell } from './Shell'

test('sidebar exposes navigation and toggles theme', async () => {
  render(
    <MemoryRouter>
      <Shell />
    </MemoryRouter>,
  )
  expect(screen.getByRole('navigation', { name: /main/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /theme/i }))
  expect(document.documentElement.dataset.theme).toMatch(/light|dark/)
})
