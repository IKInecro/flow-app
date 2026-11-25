import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  Braces,
  CircleDot,
  CornerUpRight,
  Equal,
  FileText,
  Flag,
  GitBranch,
  ListOrdered,
  PenLine,
  Play,
  RefreshCw,
  Repeat,
  StickyNote,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { categoryForKind, shapeForKind, shapePath } from './shapePaths'

export interface ShapeNodeData extends Record<string, unknown> {
  label: string
  kind: string
  path: string
  functionName: string
  width: number
  height: number
  hasError?: boolean
  active?: boolean
}

export type ShapeNodeType = Node<ShapeNodeData, 'shape'>

const KIND_META: Record<string, { label: string; icon: LucideIcon }> = {
  start: { label: 'Start', icon: Play },
  end: { label: 'End', icon: Flag },
  declare: { label: 'Declare', icon: Braces },
  assign: { label: 'Set value', icon: Equal },
  input: { label: 'Read input', icon: ArrowDownToLine },
  output: { label: 'Display', icon: ArrowUpFromLine },
  if: { label: 'Condition', icon: GitBranch },
  while: { label: 'Loop', icon: Repeat },
  do: { label: 'Loop', icon: RefreshCw },
  for: { label: 'Loop', icon: ListOrdered },
  call: { label: 'Function call', icon: CornerUpRight },
  comment: { label: 'Note', icon: StickyNote },
  breakpoint: { label: 'Pause', icon: CircleDot },
  turtle: { label: 'Turtle', icon: PenLine },
  file: { label: 'File', icon: FileText },
  unsupported: { label: 'Unsupported', icon: TriangleAlert },
}

export function ShapeNode({ data, selected }: NodeProps<ShapeNodeType>) {
  const shape = shapeForKind(data.kind)
  const category = categoryForKind(data.kind)
  const path = shapePath(shape, data.width, data.height)
  const label = data.label
  const meta = KIND_META[data.kind] ?? { label: 'Block', icon: Box }
  const Icon = meta.icon

  return (
    <div
      className={`flow-node flow-node--${category} flow-node--kind-${data.kind} ${selected ? 'is-selected' : ''} ${data.active ? 'is-active' : ''}`}
      style={{ width: data.width, height: data.height }}
      data-kind={data.kind}
      aria-label={label}
    >
      <svg
        className="flow-node__shape"
        viewBox={`0 0 ${data.width} ${data.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={path} vectorEffect="non-scaling-stroke" />
        <path className="flow-node__gloss" d={path} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className={`flow-node__content ${shape === 'note' ? 'flow-node__content--note' : ''}`}>
        <span className="flow-node__icon" aria-hidden="true">
          <Icon size={13} strokeWidth={2.1} />
        </span>
        <span className="flow-node__text">
          <span className={`flow-node__label ${shape === 'note' ? 'flow-node__label--note' : ''}`}>
            {label}
          </span>
          <span className="flow-node__meta">{meta.label}</span>
        </span>
      </span>
      {data.hasError ? (
        <span className="flow-node__badge" role="img" aria-label="Validation error" title="Validation problem">
          !
        </span>
      ) : null}
      {data.kind !== 'start' ? <Handle type="target" position={Position.Top} className="flow-handle" /> : null}
      {data.kind !== 'end' ? (
        <Handle type="source" position={Position.Bottom} className="flow-handle" />
      ) : null}
    </div>
  )
}
