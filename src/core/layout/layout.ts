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

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: 'Yes' | 'No' | 'Then' | 'Else'
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
  ): void {
    edges.push({ id: `e${edgeSeq++}`, source, target, ...(label ? { label } : {}) })
    if (includeInLayout) {
      graph.setEdge(source, target, {}, `g${edgeSeq++}`)
    }
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

      if (thenBranch.entry) addEdge(path, thenBranch.entry, 'Then')
      else addEdge(path, merge, 'Then')
      if (elseBranch.entry) addEdge(path, elseBranch.entry, 'Else')
      else addEdge(path, merge, 'Else')

      if (thenBranch.exit) addEdge(thenBranch.exit, merge)
      if (elseBranch.exit) addEdge(elseBranch.exit, merge)
      return { entry: path, exit: merge }
    }

    if (stmt.kind === 'while' || stmt.kind === 'do' || stmt.kind === 'for') {
      const body = buildList(stmt.body, `${path}/body`)
      const merge = addMerge(path)

      if (body.entry) addEdge(path, body.entry, 'Yes')
      else addEdge(path, merge, 'Yes')
      addEdge(path, merge, 'No')
      if (body.exit) addEdge(body.exit, path, undefined, false)

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

  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  for (const node of nodes) {
    node.x -= minX
    node.y -= minY
  }

  const width = Math.max(...nodes.map((node) => node.x + node.width))
  const height = Math.max(...nodes.map((node) => node.y + node.height))

  return { nodes, edges, width, height }
}
