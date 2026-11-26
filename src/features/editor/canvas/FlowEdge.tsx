import { useState, type DragEvent } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { FlowEdgeRoute } from '../../../core/layout/layout'
import type { EdgeInsertTarget } from '../../../core/layout/edgeInsert'
import type { StmtKind } from '../../../core/model/types'
import { INSERTABLE } from './InsertMenu'

export const BLOCK_DRAG_TYPE = 'application/x-marcoflow-block'

export interface FlowEdgeData extends Record<string, unknown> {
  live?: boolean
  route?: FlowEdgeRoute
  insert?: EdgeInsertTarget
  onDropInsert?: (kind: StmtKind, target: EdgeInsertTarget) => void
}

type Point = [number, number]

function roundedPolyline(points: Point[], radius: number): string {
  const [first] = points
  let path = `M ${first[0]} ${first[1]}`
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]
    const corner = points[index]
    const next = points[index + 1]
    const inLength = Math.hypot(corner[0] - previous[0], corner[1] - previous[1])
    const outLength = Math.hypot(next[0] - corner[0], next[1] - corner[1])
    if (inLength < 0.5 || outLength < 0.5) continue
    const curve = Math.min(radius, inLength / 2, outLength / 2)
    const before: Point = [
      corner[0] + ((previous[0] - corner[0]) * curve) / inLength,
      corner[1] + ((previous[1] - corner[1]) * curve) / inLength,
    ]
    const after: Point = [
      corner[0] + ((next[0] - corner[0]) * curve) / outLength,
      corner[1] + ((next[1] - corner[1]) * curve) / outLength,
    ]
    path += ` L ${before[0]} ${before[1]} Q ${corner[0]} ${corner[1]} ${after[0]} ${after[1]}`
  }
  const last = points[points.length - 1]
  path += ` L ${last[0]} ${last[1]}`
  return path
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
  const route = (data as FlowEdgeData | undefined)?.route
  const insert = (data as FlowEdgeData | undefined)?.insert
  const onDropInsert = (data as FlowEdgeData | undefined)?.onDropInsert
  const [over, setOver] = useState(false)
  let path: string
  let labelX: number
  let labelY: number

  if (route?.kind === 'loop-back') {
    // Leave the body, slide into the return lane, then enter the loop header
    // from its right vertex. No block ever sits under this line.
    const laneX = route.laneX + (targetX - route.anchorX)
    path = roundedPolyline(
      [
        [sourceX, sourceY],
        [sourceX, sourceY + 14],
        [laneX, sourceY + 14],
        [laneX, targetY],
        [targetX, targetY],
      ],
      10,
    )
    labelX = (sourceX + laneX) / 2
    labelY = sourceY + 14
  } else if (route?.kind === 'loop-exit') {
    // The false branch slips out of the left vertex, drops in its own lane,
    // and joins the merge under the body.
    const laneX = route.laneX + (sourceX - route.anchorX)
    path = roundedPolyline(
      [
        [sourceX, sourceY],
        [laneX, sourceY],
        [laneX, targetY - 10],
        [targetX, targetY - 10],
        [targetX, targetY],
      ],
      10,
    )
    labelX = (sourceX + laneX) / 2
    labelY = sourceY - 8
  } else {
    ;[path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 16,
      offset: 18,
    })
  }

  const live = Boolean((data as FlowEdgeData | undefined)?.live)

  function allowDrop(event: DragEvent<SVGPathElement>): void {
    if (!insert || !onDropInsert) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function drop(event: DragEvent<SVGPathElement>): void {
    event.preventDefault()
    setOver(false)
    if (!insert || !onDropInsert) return
    const kind = event.dataTransfer.getData(BLOCK_DRAG_TYPE) as StmtKind
    if (!INSERTABLE.some((item) => item.kind === kind)) return
    onDropInsert(kind, insert)
  }

  return (
    <>
      {over ? <path d={path} className="flow-edge__glow" aria-hidden="true" /> : null}
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
      {insert ? (
        <path
          d={path}
          className={`flow-edge__hit ${over ? 'is-over' : ''}`}
          onDragEnter={() => setOver(true)}
          onDragLeave={() => setOver(false)}
          onDragOver={allowDrop}
          onDrop={drop}
        />
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
