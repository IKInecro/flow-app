import { useCallback, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { formatStmt, getFunction, createStmt, insertStmt, removeStmt } from '../../../core/model/program'
import type { InsertPosition } from '../../../core/model/program'
import type { StmtKind } from '../../../core/model/types'
import { layoutFunction } from '../../../core/layout/layout'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { InsertMenu, type InsertTarget } from './InsertMenu'
import { ShapeToolbar } from './NodeToolbar'
import { ShapeNode, type ShapeNodeData } from './ShapeNode'

const nodeTypes = { shape: ShapeNode }

export function FlowCanvas() {
  const program = useProjectStore((state) => state.program)
  const commit = useProjectStore((state) => state.commit)
  const viewState = useProjectStore((state) => state.viewState)
  const setNodeOffset = useProjectStore((state) => state.setNodeOffset)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const selectedPath = useUiStore((state) => state.selectedPath)
  const select = useUiStore((state) => state.select)
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null)

  const fn = program ? getFunction(program, selectedFunction) : undefined
  const layout = useMemo(() => (fn ? layoutFunction(fn) : null), [fn])

  const nodes = useMemo<Node<ShapeNodeData>[]>(() => {
    if (!layout) return []
    return layout.nodes.map((item) => {
      const offset = viewState.nodeOffsets[item.path]
      const isMerge = item.kind === 'merge'
      return {
        id: item.id,
        type: 'shape',
        position: {
          x: item.x + (offset?.x ?? 0),
          y: item.y + (offset?.y ?? 0),
        },
        draggable: !isMerge && item.kind !== 'start' && item.kind !== 'end',
        selectable: !isMerge,
        width: item.width,
        height: item.height,
        style: isMerge ? { opacity: 0, pointerEvents: 'none' } : undefined,
        data: {
          label:
            item.kind === 'start'
              ? 'Mulai'
              : item.kind === 'end'
                ? 'Selesai'
                : item.stmt
                  ? formatStmt(item.stmt)
                  : '',
          kind: item.kind,
          path: item.path,
          functionName: selectedFunction,
          width: item.width,
          height: item.height,
        },
      }
    })
  }, [layout, selectedFunction, viewState.nodeOffsets])

  const edges = useMemo<Edge[]>(() => {
    if (!layout) return []
    return layout.edges.map((item) => ({
      id: item.id,
      source: item.source,
      target: item.target,
      type: 'smoothstep',
      label: item.label,
      labelStyle: { fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: 'var(--surface)', fillOpacity: 0.9 },
      labelBgPadding: [5, 3] as [number, number],
      style: { stroke: 'var(--border-strong, var(--border))', strokeWidth: 1.6 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--text-muted)' },
    }))
  }, [layout])

  const handleDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      if (!layout) return
      const base = layout.nodes.find((item) => item.id === node.id)
      if (!base || base.kind === 'merge') return
      setNodeOffset(base.path, {
        x: node.position.x - base.x,
        y: node.position.y - base.y,
      })
    },
    [layout, setNodeOffset],
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const path = node.data.path
      if (typeof path === 'string' && path) select(path)
    },
    [select],
  )

  const selectedNode = layout?.nodes.find((item) => item.path === selectedPath && item.stmt)

  function handleInsert(position: InsertPosition): void {
    if (!selectedNode) return
    setInsertTarget({ functionName: selectedFunction, path: selectedNode.path, position })
  }

  function runInsert(kind: StmtKind): void {
    if (!insertTarget) return
    const target = insertTarget
    setInsertTarget(null)
    commit((current) =>
      insertStmt(current, target.functionName, target.path, target.position, createStmt(kind)),
    )
  }

  function deleteSelected(): void {
    if (!selectedNode) return
    const path = selectedNode.path
    select(null)
    commit((current) => removeStmt(current, selectedFunction, path))
  }

  if (!program || !layout) {
    return (
      <div className="canvas canvas--empty">
        <p>Pilih atau buat proyek dulu.</p>
      </div>
    )
  }

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeDragStop={handleDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={() => select(null)}
        fitView
        fitViewOptions={{ padding: 0.24, maxZoom: 1.1 }}
        minZoom={0.2}
        maxZoom={1.8}
        nodesConnectable={false}
        edgesFocusable={false}
        proOptions={{ hideAttribution: true }}
        aria-label="Kanvas flowchart"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="var(--bg-grid)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      {selectedNode ? (
        <div className="canvas__selection">
          <ShapeToolbar
            kind={selectedNode.kind}
            stmt={selectedNode.stmt}
            onInsert={handleInsert}
            onEdit={() => undefined}
            onDelete={deleteSelected}
          />
          {insertTarget ? (
            <InsertMenu
              target={insertTarget}
              onInsert={(kind) => runInsert(kind)}
              onClose={() => setInsertTarget(null)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
