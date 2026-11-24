import type { FlowType } from '../../../core/model/types'

export type ShapeKind =
  | 'terminator'
  | 'rectangle'
  | 'parallelogram'
  | 'diamond'
  | 'hexagon'
  | 'note'
  | 'breakpoint'
  | 'circle'

export function shapeForKind(kind: string): ShapeKind {
  switch (kind) {
    case 'start':
    case 'end':
      return 'terminator'
    case 'declare':
    case 'assign':
      return 'rectangle'
    case 'input':
    case 'output':
    case 'call':
      return 'parallelogram'
    case 'if':
    case 'while':
    case 'do':
    case 'for':
      return 'diamond'
    case 'comment':
      return 'note'
    case 'breakpoint':
      return 'breakpoint'
    default:
      return 'rectangle'
  }
}

export function categoryForKind(kind: string): string {
  switch (kind) {
    case 'start':
    case 'end':
      return 'term'
    case 'declare':
    case 'assign':
    case 'input':
    case 'output':
    case 'call':
      return 'action'
    case 'if':
    case 'while':
    case 'do':
    case 'for':
      return 'branch'
    case 'comment':
      return 'note'
    case 'breakpoint':
      return 'break'
    default:
      return 'other'
  }
}

export function shapePath(shape: ShapeKind, width: number, height: number): string {
  const w = width
  const h = height
  switch (shape) {
    case 'terminator': {
      const r = h / 2
      return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
    }
    case 'parallelogram': {
      const skew = Math.min(22, w * 0.12)
      return `M ${skew} 0 H ${w} L ${w - skew} ${h} H 0 Z`
    }
    case 'diamond':
      return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`
    case 'hexagon': {
      const cut = Math.min(18, w * 0.1)
      return `M ${cut} 0 H ${w - cut} L ${w} ${h / 2} L ${w - cut} ${h} H ${cut} L 0 ${h / 2} Z`
    }
    case 'note': {
      const cut = 14
      return `M 0 0 H ${w - cut} L ${w} ${cut} V ${h} H 0 Z M ${w - cut} 0 V ${cut} H ${w}`
    }
    case 'breakpoint':
      return `M ${h / 2} 0 A ${h / 2} ${h / 2} 0 1 1 ${h / 2 - 0.01} 0 Z`
    case 'circle': {
      const r = Math.min(w, h) / 2
      return `M ${r} 0 A ${r} ${r} 0 1 1 ${r - 0.01} 0 Z`
    }
    case 'rectangle':
    default:
      return `M 0 0 H ${w} V ${h} H 0 Z`
  }
}

export function typeBadge(type: FlowType | undefined): string {
  if (!type || type === 'None') return ''
  return type
}
