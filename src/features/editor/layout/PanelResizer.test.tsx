import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { PanelResizer } from './PanelResizer'

test('dragging or nudging a divider reports a clamped size', () => {
  const onResize = vi.fn()
  render(
    <PanelResizer
      orientation="vertical"
      value={196}
      min={150}
      max={340}
      label="Resize shapes panel"
      onResize={onResize}
    />,
  )

  const divider = screen.getByRole('separator', { name: 'Resize shapes panel' })
  expect(divider).toHaveAttribute('aria-valuenow', '196')

  fireEvent.keyDown(divider, { key: 'ArrowRight' })
  expect(onResize).toHaveBeenLastCalledWith(208)

  fireEvent.keyDown(divider, { key: 'ArrowRight', shiftKey: true })
  expect(onResize).toHaveBeenLastCalledWith(228)

  fireEvent.keyDown(divider, { key: 'Home' })
  expect(onResize).toHaveBeenLastCalledWith(150)

  fireEvent.keyDown(divider, { key: 'End' })
  expect(onResize).toHaveBeenLastCalledWith(340)
})

test('an inverted horizontal divider grows when dragged up', () => {
  const onResize = vi.fn()
  render(
    <PanelResizer
      orientation="horizontal"
      value={186}
      min={120}
      max={420}
      invert
      label="Resize console"
      onResize={onResize}
    />,
  )

  fireEvent.keyDown(screen.getByRole('separator', { name: 'Resize console' }), { key: 'ArrowUp' })
  expect(onResize).toHaveBeenLastCalledWith(198)
})
