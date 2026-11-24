import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { InsertMenu } from './InsertMenu'

test('lists shapes and returns the target position', async () => {
  const onInsert = vi.fn()
  render(
    <InsertMenu
      target={{ functionName: 'Main', path: '0', position: 'into-then' }}
      onInsert={onInsert}
    />,
  )
  expect(screen.getByRole('menu')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('menuitem', { name: /output/i }))
  expect(onInsert).toHaveBeenCalledWith('output', 'into-then')
})

test('supports before and after insertion', async () => {
  const onInsert = vi.fn()
  render(
    <InsertMenu
      target={{ functionName: 'Main', path: '2', position: 'before' }}
      onInsert={onInsert}
    />,
  )
  await userEvent.click(screen.getByRole('menuitem', { name: /assign/i }))
  expect(onInsert).toHaveBeenCalledWith('assign', 'before')
})
