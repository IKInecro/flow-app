import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Plus, X } from 'lucide-react'
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
import { insertPointForEdge, type EdgeInsertTarget } from '../../../core/layout/edgeInsert'
import { checkProgram } from '../../../core/lang/validate'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { useRuntimeStore } from '../../run/runtimeStore'
import { RunToolbar } from '../../run/RunToolbar'
import { FlowEdge, type FlowEdgeData } from './FlowEdge'
import { INSERTABLE, InsertMenu, type InsertTarget } from './InsertMenu'
import { kindMeta } from './nodeMeta'
import { ShapeToolbar } from './NodeToolbar'
import { ShapeNode, type ShapeNodeData } from './ShapeNode'

const nodeTypes = { shape: ShapeNode }
const edgeTypes = { flow: FlowEdge }

interface EdgeMenuState {
  x: number
  y: number
  above: boolean
  align: 'start' | 'center' | 'end'
  open: boolean
  target: EdgeInsertTarget
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

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
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState | null>(null)
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLDivElement | null>(null)

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

  const insertAt = useCallback(
    (target: EdgeInsertTarget, kind: StmtKind) => {
      commit((current) =>
        target.point.kind === 'append'
          ? appendStmt(current, target.functionName, createStmt(kind))
          : insertStmt(
              current,
              target.functionName,
              target.point.path,
              target.point.position,
              createStmt(kind),
            ),
      )
    },
    [commit],
  )

  const handleEdgeDropInsert = useCallback(
    (kind: StmtKind, target: EdgeInsertTarget) => {
      insertAt(target, kind)
    },
    [insertAt],
  )

  const edges = useMemo<Edge[]>(() => {
    if (!layout) return []
    const nodePaths = new Map(layout.nodes.map((item) => [item.id, item.path]))
    const mergeIds = new Set(
      layout.nodes.filter((item) => item.kind === 'merge').map((item) => item.id),
    )
    return layout.edges.map((item) => {
      const live = Boolean(activePath) && nodePaths.get(item.source) === activePath
      const intoMerge = mergeIds.has(item.target)
      const point = insertPointForEdge(item, layout.nodes)
      const insert = point ? { functionName: selectedFunction, point } : undefined
      return {
        id: item.id,
        source: item.source,
        target: item.target,
        sourceHandle: item.sourceHandle,
        targetHandle: item.targetHandle,
        type: 'flow',
        label: item.label,
        interactionWidth: 28,
        data: {
          live,
          route: item.route,
          ...(insert ? { insert, onDropInsert: handleEdgeDropInsert } : {}),
        },
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
  }, [layout, activePath, selectedFunction, handleEdgeDropInsert])

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

  const handleEdgeClick = useCallback((event: MouseEvent, edge: Edge) => {
    const data = edge.data as FlowEdgeData | undefined
    if (!data?.insert) return
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return
    const x = clamp(event.clientX - bounds.left, 36, bounds.width - 36)
    const y = clamp(event.clientY - bounds.top, 44, bounds.height - 44)
    setEdgeMenu({
      x,
      y,
      above: y > bounds.height * 0.58,
      align: x < 176 ? 'start' : x > bounds.width - 176 ? 'end' : 'center',
      open: false,
      target: data.insert,
    })
  }, [])

  useEffect(() => {
    if (!edgeMenu) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setEdgeMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [edgeMenu])

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

  function runEdgeInsert(kind: StmtKind): void {
    if (!edgeMenu) return
    const target = edgeMenu.target
    setEdgeMenu(null)
    insertAt(target, kind)
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
    <div ref={canvasRef} className={`canvas ${dragging ? 'is-dragging' : ''}`}>
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
        onEdgeClick={handleEdgeClick}
        onPaneClick={() => {
          select(null)
          setEdgeMenu(null)
        }}
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

      {edgeMenu ? (
        <div
          className={`edge-insert ${edgeMenu.open ? 'is-open' : ''} ${
            edgeMenu.above ? 'edge-insert--above' : ''
          } edge-insert--${edgeMenu.align}`}
          style={{ left: edgeMenu.x, top: edgeMenu.y }}
        >
          {edgeMenu.open ? (
            <div className="edge-insert__panel" role="menu" aria-label="Insert block on connector">
              <header className="edge-insert__head">
                <span>Insert on connector</span>
                <button
                  type="button"
                  className="edge-insert__close"
                  aria-label="Close insert menu"
                  onClick={() => setEdgeMenu(null)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </header>
              <div className="edge-insert__grid">
                {INSERTABLE.map((item) => {
                  const Icon = kindMeta(item.kind).icon
                  return (
                    <button
                      key={item.kind}
                      type="button"
                      role="menuitem"
                      className="edge-insert__item"
                      title={item.hint}
                      onClick={() => runEdgeInsert(item.kind)}
                    >
                      <Icon size={15} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="edge-insert__plus"
              aria-label="Insert block on connector"
              title="Insert block here"
              onClick={() => setEdgeMenu((current) => (current ? { ...current, open: true } : current))}
            >
              <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
            </button>
          )}
        </div>
      ) : null}

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
