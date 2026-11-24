import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export interface FlowEdgeData extends Record<string, unknown> {
  live?: boolean
}

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
    offset: 18,
  })
  const live = Boolean((data as FlowEdgeData | undefined)?.live)

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={`flow-edge__line ${live ? 'is-live' : ''}`}
      />
      {live ? (
        <>
          <path d={path} pathLength={1} className="flow-edge__pulse" />
          <circle r="3.4" className="flow-edge__dot">
            <animateMotion dur="1.1s" repeatCount="indefinite" path={path} />
          </circle>
        </>
      ) : null}
      {label ? (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="flow-edge__label"
        >
          {label}
        </text>
      ) : null}
    </>
  )
}
