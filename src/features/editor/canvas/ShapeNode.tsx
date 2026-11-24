import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { categoryForKind, shapeForKind, shapePath } from './shapePaths'

export interface ShapeNodeData extends Record<string, unknown> {
  label: string
  kind: string
  path: string
  functionName: string
  width: number
  height: number
}

export type ShapeNodeType = Node<ShapeNodeData, 'shape'>

export function ShapeNode({ data, selected }: NodeProps<ShapeNodeType>) {
  const shape = shapeForKind(data.kind)
  const category = categoryForKind(data.kind)
  const isTerminator = data.kind === 'start' || data.kind === 'end'
  const path = shapePath(shape, data.width, data.height)
  const label = data.label

  return (
    <div
      className={`flow-node flow-node--${category} ${selected ? 'is-selected' : ''}`}
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
      </svg>
      <span className={`flow-node__label ${shape === 'note' ? 'flow-node__label--note' : ''}`}>
        {label}
      </span>
      {!isTerminator ? <Handle type="target" position={Position.Top} className="flow-handle" /> : null}
      {data.kind !== 'end' ? (
        <Handle type="source" position={Position.Bottom} className="flow-handle" />
      ) : null}
    </div>
  )
}
