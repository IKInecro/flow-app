import * as dagre from 'dagre'
import type { FunctionDef, Stmt, StmtKind } from '../model/types'
import { MERGE_SIZE, NODE_SIZE, TERMINATOR_SIZE } from './shapes'

export { NODE_SIZE } from './shapes'

export type FlowNodeKind = StmtKind | 'start' | 'end' | 'merge'

export interface FlowNode {
  id: string
  path: string
  kind: FlowNodeKind
  stmt: Stmt | null
  x: number
  y: number
  width: number
  height: number
}

export type FlowHandle =
  | 'in'
  | 'out'
  | 'left-out'
  | 'right-out'
  | 'exit-out'
  | 'loop-in'

export interface FlowEdgeRoute {
  kind: 'loop-back' | 'loop-exit'
  laneX: number
  // Header vertex the lane was measured from, so the lane follows a drag.
  anchorX: number
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: 'Yes' | 'No' | 'Then' | 'Else'
  sourceHandle?: FlowHandle
  targetHandle?: FlowHandle
  route?: FlowEdgeRoute
}

interface Lane {
  x: number
  top: number
  bottom: number
}

interface LoopRecord {
  headerId: string
  entryId?: string
  bodyIds: string[]
  mergeId: string
  exitEdge: FlowEdge
  backEdge?: FlowEdge
}

interface BranchRecord {
  headerId: string
  mergeId: string
  thenEdge: FlowEdge
  elseEdge: FlowEdge
  thenId?: string
  elseId?: string
}

export interface LayoutResult {
  nodes: FlowNode[]
  edges: FlowEdge[]
  width: number
  height: number
}

export function layoutFunction(fn: FunctionDef): LayoutResult {
  const graph = new dagre.graphlib.Graph({ multigraph: true })
  graph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 70, marginx: 0, marginy: 0 })
  graph.setDefaultEdgeLabel(() => ({}))

  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  const loops: LoopRecord[] = []
  const branches: BranchRecord[] = []
  let edgeSeq = 0

  function addNode(node: FlowNode): void {
    nodes.push(node)
    graph.setNode(node.id, { width: node.width, height: node.height })
  }

  function addEdge(
    source: string,
    target: string,
    label?: FlowEdge['label'],
    includeInLayout = true,
    sourceHandle: FlowHandle = 'out',
    targetHandle: FlowHandle = 'in',
  ): FlowEdge {
    const edge: FlowEdge = {
      id: `e${edgeSeq++}`,
      source,
      target,
      sourceHandle,
      targetHandle,
      ...(label ? { label } : {}),
    }
    edges.push(edge)
    if (includeInLayout) {
      graph.setEdge(source, target, {}, `g${edgeSeq++}`)
    }
    return edge
  }

  // Ranks a merge below its loop body without drawing an extra connector.
  function addRankEdge(source: string, target: string): void {
    graph.setEdge(source, target, {}, `r${edgeSeq++}`)
  }

  function mergeId(path: string): string {
    return `merge:${path}`
  }

  function addMerge(path: string): string {
    const id = mergeId(path)
    addNode({
      id,
      path,
      kind: 'merge',
      stmt: null,
      x: 0,
      y: 0,
      width: MERGE_SIZE.width,
      height: MERGE_SIZE.height,
    })
    return id
  }

  function buildList(body: Stmt[], basePath: string): { entry: string | null; exit: string | null } {
    let entry: string | null = null
    let previousExit: string | null = null

    body.forEach((stmt, index) => {
      const path = basePath ? `${basePath}/${index}` : String(index)
      const size = NODE_SIZE[stmt.kind]
      addNode({
        id: path,
        path,
        kind: stmt.kind,
        stmt,
        x: 0,
        y: 0,
        width: size.width,
        height: size.height,
      })
      const built = buildStatement(stmt, path)
      if (previousExit) addEdge(previousExit, built.entry)
      else entry = built.entry
      previousExit = built.exit
    })

    return { entry, exit: previousExit }
  }

  function buildStatement(stmt: Stmt, path: string): { entry: string; exit: string } {
    if (stmt.kind === 'if') {
      const thenBranch = buildList(stmt.then, `${path}/then`)
      const elseBranch = buildList(stmt.else, `${path}/else`)
      const merge = addMerge(path)

      const thenEdge = thenBranch.entry
        ? addEdge(path, thenBranch.entry, 'Then', true, 'left-out')
        : addEdge(path, merge, 'Then', true, 'left-out')
      const elseEdge = elseBranch.entry
        ? addEdge(path, elseBranch.entry, 'Else', true, 'right-out')
        : addEdge(path, merge, 'Else', true, 'right-out')
      branches.push({
        headerId: path,
        mergeId: merge,
        thenEdge,
        elseEdge,
        ...(thenBranch.entry ? { thenId: thenBranch.entry } : {}),
        ...(elseBranch.entry ? { elseId: elseBranch.entry } : {}),
      })

      if (thenBranch.exit) addEdge(thenBranch.exit, merge)
      if (elseBranch.exit) addEdge(elseBranch.exit, merge)
      return { entry: path, exit: merge }
    }

    if (stmt.kind === 'while' || stmt.kind === 'do' || stmt.kind === 'for') {
      const firstBodyNode = nodes.length
      const body = buildList(stmt.body, `${path}/body`)
      const bodyIds = nodes.slice(firstBodyNode).map((node) => node.id)
      const merge = addMerge(path)

      if (body.entry) addEdge(path, body.entry, 'Yes')
      else addEdge(path, merge, 'Yes')
      const exitEdge = addEdge(path, merge, 'No', true, 'exit-out')
      let backEdge: FlowEdge | undefined
      if (body.exit) {
        backEdge = addEdge(body.exit, path, undefined, false, 'out', 'loop-in')
        // Force the loop exit below the whole body instead of beside it.
        addRankEdge(body.exit, merge)
      }

      loops.push({
        headerId: path,
        bodyIds,
        ...(body.entry ? { entryId: body.entry } : {}),
        mergeId: merge,
        exitEdge,
        ...(backEdge ? { backEdge } : {}),
      })

      return { entry: path, exit: merge }
    }

    return { entry: path, exit: path }
  }

  addNode({
    id: '__start',
    path: '',
    kind: 'start',
    stmt: null,
    x: 0,
    y: 0,
    width: TERMINATOR_SIZE.width,
    height: TERMINATOR_SIZE.height,
  })

  const built = buildList(fn.body, '')

  addNode({
    id: '__end',
    path: '',
    kind: 'end',
    stmt: null,
    x: 0,
    y: 0,
    width: TERMINATOR_SIZE.width,
    height: TERMINATOR_SIZE.height,
  })

  if (built.entry) addEdge('__start', built.entry)
  else addEdge('__start', '__end')
  if (built.exit) addEdge(built.exit, '__end')

  dagre.layout(graph)

  for (const node of nodes) {
    const point = graph.node(node.id)
    if (!point) continue
    node.x = point.x - node.width / 2
    node.y = point.y - node.height / 2
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  // A loop body should hang straight under its condition, not drift a column
  // right at every nesting level. Centre the body and the exit merge on the
  // header, working from the outermost loop inward.
  for (const loop of [...loops].reverse()) {
    const header = nodeById.get(loop.headerId)
    const merge = nodeById.get(loop.mergeId)
    if (!header) continue
    const headerCenter = header.x + header.width / 2
    const entry = loop.entryId ? nodeById.get(loop.entryId) : undefined
    if (entry) {
      const delta = headerCenter - (entry.x + entry.width / 2)
      if (Math.abs(delta) > 0.5) {
        for (const id of loop.bodyIds) {
          const node = nodeById.get(id)
          if (node) node.x += delta
        }
      }
    }
    if (merge) merge.x = headerCenter - merge.width / 2
  }

  // A branch merge belongs under its condition as well.
  for (const branch of branches) {
    const header = nodeById.get(branch.headerId)
    const merge = nodeById.get(branch.mergeId)
    if (!header || !merge) continue
    merge.x = header.x + header.width / 2 - merge.width / 2
  }

  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  for (const node of nodes) {
    node.x -= minX
    node.y -= minY
  }

  // Loop connectors travel in their own lane outside the body, so a return
  // line never runs back through the blocks it came from.
  const usedLanes: { right: Lane[]; left: Lane[] } = { right: [], left: [] }

  // Branch handles follow the side where dagre actually placed each child,
  // so a branch line never cuts back across its sibling.
  function sideFor(header: FlowNode, id: string | undefined): 'left' | 'right' | null {
    if (!id) return null
    const child = nodeById.get(id)
    if (!child) return null
    const headerCenter = header.x + header.width / 2
    return child.x + child.width / 2 < headerCenter ? 'left' : 'right'
  }

  for (const branch of branches) {
    const header = nodeById.get(branch.headerId)
    if (!header) continue
    let thenSide = sideFor(header, branch.thenId)
    let elseSide = sideFor(header, branch.elseId)
    if (thenSide && elseSide && thenSide === elseSide) {
      thenSide = 'left'
      elseSide = 'right'
    } else if (!thenSide && elseSide) {
      thenSide = elseSide === 'left' ? 'right' : 'left'
    } else if (thenSide && !elseSide) {
      elseSide = thenSide === 'left' ? 'right' : 'left'
    } else if (!thenSide && !elseSide) {
      thenSide = 'left'
      elseSide = 'right'
    }
    branch.thenEdge.sourceHandle = thenSide === 'left' ? 'left-out' : 'right-out'
    branch.elseEdge.sourceHandle = elseSide === 'left' ? 'left-out' : 'right-out'
  }

  function takeLane(
    side: 'right' | 'left',
    base: number,
    top: number,
    bottom: number,
  ): number {
    const step = side === 'right' ? 18 : -18
    let lane = base
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const clash = usedLanes[side].some(
        (item) =>
          Math.abs(item.x - lane) < 10 &&
          top < item.bottom + 12 &&
          bottom > item.top - 12,
      )
      if (!clash) break
      lane += step
    }
    usedLanes[side].push({ x: lane, top, bottom })
    return lane
  }

  for (const loop of loops) {
    const header = nodeById.get(loop.headerId)
    const merge = nodeById.get(loop.mergeId)
    if (!header || !merge) continue
    const body = loop.bodyIds
      .map((id) => nodeById.get(id))
      .filter((node): node is FlowNode => Boolean(node))

    const top = Math.min(header.y, merge.y, ...body.map((node) => node.y))
    const bottom = Math.max(
      header.y + header.height,
      merge.y + merge.height,
      ...body.map((node) => node.y + node.height),
    )
    const bodyRight = Math.max(
      header.x + header.width,
      ...body.map((node) => node.x + node.width),
    )
    const bodyLeft = Math.min(header.x, ...body.map((node) => node.x))

    if (loop.backEdge) {
      const laneX = takeLane('right', bodyRight + 30, top, bottom)
      loop.backEdge.route = { kind: 'loop-back', laneX, anchorX: header.x + header.width }
    }
    const laneX = takeLane('left', bodyLeft - 30, top, bottom)
    loop.exitEdge.route = { kind: 'loop-exit', laneX, anchorX: header.x }
  }

  const width = Math.max(...nodes.map((node) => node.x + node.width))
  const height = Math.max(...nodes.map((node) => node.y + node.height))

  return { nodes, edges, width, height }
}
