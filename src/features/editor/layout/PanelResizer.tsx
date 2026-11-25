import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

interface PanelResizerProps {
  orientation: 'vertical' | 'horizontal'
  value: number
  min: number
  max: number
  /** Dragging the right or bottom edge grows the panel; the left or top edge shrinks it. */
  invert?: boolean
  label: string
  onResize: (value: number) => void
}

export function PanelResizer({
  orientation,
  value,
  min,
  max,
  invert = false,
  label,
  onResize,
}: PanelResizerProps) {
  const start = useRef({ pointer: 0, value })
  const vertical = orientation === 'vertical'

  function clamp(next: number): number {
    return Math.min(max, Math.max(min, Math.round(next)))
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    event.preventDefault()
    start.current = { pointer: vertical ? event.clientX : event.clientY, value }
    const target = event.currentTarget
    target.setPointerCapture?.(event.pointerId)
    document.body.classList.add(vertical ? 'is-resizing-x' : 'is-resizing-y')

    const move = (moveEvent: globalThis.PointerEvent): void => {
      const current = vertical ? moveEvent.clientX : moveEvent.clientY
      const delta = current - start.current.pointer
      onResize(clamp(start.current.value + (invert ? -delta : delta)))
    }
    const up = (): void => {
      document.body.classList.remove('is-resizing-x', 'is-resizing-y')
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
    }

    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = event.shiftKey ? 32 : 12
    const grow = invert ? -1 : 1
    const keys: Record<string, number> = vertical
      ? { ArrowRight: step * grow, ArrowLeft: -step * grow }
      : { ArrowDown: step * grow, ArrowUp: -step * grow }

    if (event.key in keys) {
      event.preventDefault()
      onResize(clamp(value + keys[event.key]))
    }
    if (event.key === 'Home') {
      event.preventDefault()
      onResize(min)
    }
    if (event.key === 'End') {
      event.preventDefault()
      onResize(max)
    }
  }

  return (
    <div
      className={`panel-resizer panel-resizer--${orientation}`}
      role="separator"
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <span className="panel-resizer__grip" aria-hidden="true" />
    </div>
  )
}
