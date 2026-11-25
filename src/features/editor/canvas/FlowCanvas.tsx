import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  appendStmt,
  createStmt,
  formatStmt,
  getFunction,
  insertStmt,
  removeStmt,
} from '../../../core/model/program'
import type { InsertPosition } from '../../../core/model/program'
import type { StmtKind } from '../../../core/model/types'
import { layoutFunction } from '../../../core/layout/layout'
import { checkProgram } from '../../../core/lang/validate'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { useRuntimeStore } from '../../run/runtimeStore'
import { RunToolbar } from '../../run/RunToolbar'
import { FlowEdge } from './FlowEdge'
import { InsertMenu, type InsertTarget } from './InsertMenu'
import { ShapeToolbar } from './NodeToolbar'
import { ShapeNode, type ShapeNodeData } from './ShapeNode'

const nodeTypes = { shape: ShapeNode }
const edgeTypes = { flow: FlowEdge }

export function FlowCanvas() {
  const program = useProjectStore((state) => state.program)
  const commit = useProjectStore((state) => state.commit)
  const viewState = useProjectStore((state) => state.viewState)
  const setNodeOffset = useProjectStore((state) => state.setNodeOffset)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const selectedPath = useUiStore((state) => state.selectedPath)
  const select = useUiStore((state) => state.select)
  const setNodeCardOpen = useUiStore((state) => state.setNodeCardOpen)
  const activePath = useRuntimeStore((state) => state.activePath)
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null)
  const [dragging, setDragging] = useState(false)

  const errorPaths = useMemo(() => {
    if (!program) return new Set<string>()
    return new Set(
      checkProgram(program)
        .filter((item) => item.severity === 'error' && item.function === selectedFunction)
        .map((item) => item.path),
    )
  }, [program, selectedFunction])

  const fn = program ? getFunction(program, selectedFunction) : undefined
  const layout = useMemo(() => (fn ? layoutFunction(fn) : null), [fn])

  const nodes = useMemo<Node<ShapeNodeData>[]>(() => {
    if (!layout) return []
    return layout.nodes.map((item) => {      const offset = viewState.nodeOffsets[item.path]
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
        selected: !isMerge && item.path === selectedPath,
        width: item.width,
        height: item.height,
        style: isMerge ? { opacity: 0, pointerEvents: 'none' } : undefined,
        data: {
          label:
            item.kind === 'start'
              ? 'Start'
              : item.kind === 'end'
                ? 'End'
                : item.stmt
                  ? formatStmt(item.stmt)
                  : '',
          kind: item.kind,
          path: item.path,
          functionName: selectedFunction,
          width: item.width,
          height: item.height,
          hasError: Boolean(item.stmt) && errorPaths.has(item.path),
          active: Boolean(activePath) && item.path === activePath,
        },
      }
    })
  }, [layout, selectedFunction, selectedPath, viewState.nodeOffsets, errorPaths, activePath])

  // React Flow is controlled here: keep its live copy so a node tracks the
  // pointer during the drag, then persist the offset on drop.
  const [liveNodes, setLiveNodes, handleNodesChange] = useNodesState<Node<ShapeNodeData>>(nodes)
  useEffect(() => setLiveNodes(nodes), [nodes, setLiveNodes])

  const edges = useMemo<Edge[]>(() => {
    if (!layout) return []
    const nodePaths = new Map(layout.nodes.map((item) => [item.id, item.path]))
    const mergeIds = new Set(
      layout.nodes.filter((item) => item.kind === 'merge').map((item) => item.id),
    )
    return layout.edges.map((item) => {
      const live = Boolean(activePath) && nodePaths.get(item.source) === activePath
      const intoMerge = mergeIds.has(item.target)
      return {
        id: item.id,
        source: item.source,
        target: item.target,
        sourceHandle: item.sourceHandle,
        targetHandle: item.targetHandle,
        type: 'flow',
        label: item.label,
        data: { live, route: item.route },
        markerEnd: intoMerge
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: live ? 18 : 15,
              height: live ? 18 : 15,
              color: live ? 'var(--accent)' : 'var(--text-muted)',
            },
      }
    })
  }, [layout, activePath])

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
      if (typeof path === 'string' && path) {
        select(path)
        setNodeCardOpen(true)
      }
    },
    [select, setNodeCardOpen],
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

  function addFirstOutput(): void {
    commit((current) =>
      appendStmt(current, selectedFunction, {
        kind: 'output',
        expression: '"Halo, dunia!"',
        newline: true,
      }),
    )
  }

  function editSelected(): void {
    if (!selectedNode) return
    setNodeCardOpen(true)
    window.setTimeout(() => {
      const field = document.querySelector<HTMLElement>(
        '.node-card input, .node-card select, .node-card textarea',
      )
      field?.focus()
    }, 30)
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
        <p>Pick or create a project first.</p>
      </div>
    )
  }

  return (
    <div className={`canvas ${dragging ? 'is-dragging' : ''}`}>
      <div className="canvas__hud" role="status">
        <span className={`canvas__hud-dot ${activePath ? 'is-live' : ''}`} aria-hidden="true" />
        <strong>{selectedFunction}</strong>
        <span>{fn ? fn.body.length : 0} {(fn ? fn.body.length : 0) === 1 ? 'step' : 'steps'}</span>
      </div>
      <ReactFlow
        nodes={liveNodes}
        onNodesChange={handleNodesChange}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStart={() => setDragging(true)}
        onNodeDragStop={(event, node, nodeBounds) => {
          handleDragStop(event, node, nodeBounds)
          setDragging(false)
        }}
        onNodeClick={handleNodeClick}
        onPaneClick={() => select(null)}
        fitView
        fitViewOptions={{ padding: 0.24, maxZoom: 1.1 }}
        minZoom={0.2}
        maxZoom={1.8}
        nodesConnectable={false}
        edgesFocusable={false}
        proOptions={{ hideAttribution: true }}
        aria-label="Flowchart canvas"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.3} color="var(--bg-grid)" />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap
          pannable
          zoomable
          position="top-right"
          style={{ width: 132, height: 84 }}
          nodeStrokeWidth={2}
          nodeColor={(node) => {
            const kind = (node.data as ShapeNodeData | undefined)?.kind
            if (kind === 'start' || kind === 'end') return 'var(--success)'
            if (kind === 'if' || kind === 'while' || kind === 'do' || kind === 'for') return 'var(--warning)'
            if (kind === 'comment') return 'var(--text-muted)'
            return 'var(--accent)'
          }}
        />
      </ReactFlow>

      <RunToolbar />

      {fn && fn.body.length === 0 ? (
        <div className="canvas__cta">
          <p>Function {selectedFunction} is still empty.</p>
          <button type="button" className="button button--primary" onClick={addFirstOutput}>
            Add Output
          </button>
        </div>
      ) : null}

      {selectedNode ? (
        <div className="canvas__selection">
          <ShapeToolbar
            kind={selectedNode.kind}
            stmt={selectedNode.stmt}
            onInsert={handleInsert}
            onEdit={editSelected}
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
