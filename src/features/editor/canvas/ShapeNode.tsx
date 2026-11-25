import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { NodeCard } from '../inspector/NodeCard'
import { useUiStore } from '../store/uiStore'
import { categoryForKind, shapeForKind, shapePath } from './shapePaths'
import { kindMeta } from './nodeMeta'

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

export function ShapeNode({ data, selected }: NodeProps<ShapeNodeType>) {
  const shape = shapeForKind(data.kind)
  const category = categoryForKind(data.kind)
  const path = shapePath(shape, data.width, data.height)
  const label = data.label
  const meta = kindMeta(data.kind)
  const Icon = meta.icon
  const cardOpen = useUiStore((state) => state.nodeCardOpen)
  const setNodeCardOpen = useUiStore((state) => state.setNodeCardOpen)
  const isBranch = data.kind === 'if'
  const isLoop = data.kind === 'while' || data.kind === 'do' || data.kind === 'for'
  const hasBottomOut = data.kind !== 'end' && !isBranch
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null)
  const showCard = Boolean(selected && cardOpen)

  useEffect(() => {
    if (!showCard) {
      setAnchor(null)
      return
    }
    let frame = 0
    function place(): void {
      const rect = nodeRef.current?.getBoundingClientRect()
      if (!rect) {
        frame = window.requestAnimationFrame(place)
        return
      }
      const width = 262
      const gap = 14
      let left = rect.right + gap
      if (left + width > window.innerWidth - 14) left = rect.left - width - gap
      if (left < 14) left = 14
      const top = Math.min(Math.max(12, rect.top), Math.max(12, window.innerHeight - 330))
      setAnchor((current) =>
        current && Math.abs(current.left - left) < 0.5 && Math.abs(current.top - top) < 0.5
          ? current
          : { left, top },
      )
      frame = window.requestAnimationFrame(place)
    }
    frame = window.requestAnimationFrame(place)
    return () => window.cancelAnimationFrame(frame)
  }, [showCard])

  return (
    <div
      ref={nodeRef}
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
      {data.kind !== 'start' ? (
        <Handle id="in" type="target" position={Position.Top} className="flow-handle" />
      ) : null}
      {hasBottomOut ? (
        <Handle id="out" type="source" position={Position.Bottom} className="flow-handle" />
      ) : null}
      {isBranch ? (
        <>
          <Handle
            id="left-out"
            type="source"
            position={Position.Left}
            className="flow-handle flow-handle--side"
          />
          <Handle
            id="right-out"
            type="source"
            position={Position.Right}
            className="flow-handle flow-handle--side"
          />
        </>
      ) : null}
      {isLoop ? (
        <>
          <Handle
            id="exit-out"
            type="source"
            position={Position.Left}
            className="flow-handle flow-handle--side"
          />
          <Handle
            id="loop-in"
            type="target"
            position={Position.Right}
            className="flow-handle flow-handle--side"
          />
        </>
      ) : null}
      {showCard && anchor
        ? createPortal(
            <div
              className="node-card-portal"
              style={{ left: anchor.left, top: anchor.top }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <NodeCard
                functionName={data.functionName}
                path={data.path}
                onClose={() => setNodeCardOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
