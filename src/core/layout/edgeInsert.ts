import type { InsertPosition } from '../model/program'
import type { FlowEdge, FlowNode } from './layout'

/** Where a block lands when the user picks a connector. */
export type EdgeInsertPoint =
  | { kind: 'insert'; path: string; position: InsertPosition }
  | { kind: 'append' }

export interface EdgeInsertTarget {
  functionName: string
  point: EdgeInsertPoint
}

export function insertPointForEdge(edge: FlowEdge, nodes: FlowNode[]): EdgeInsertPoint | null {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const source = byId.get(edge.source)
  const target = byId.get(edge.target)
  if (!source || !target) return null

  // Returning to the header means "add to the end of the loop body".
  if (edge.route?.kind === 'loop-back') {
    return { kind: 'insert', path: target.path, position: 'into-body' }
  }
  // The false lane leaves the loop and joins below it.
  if (edge.route?.kind === 'loop-exit') {
    return { kind: 'insert', path: target.path, position: 'after' }
  }

  if (target.kind === 'merge') {
    if (edge.label === 'Then') return { kind: 'insert', path: target.path, position: 'into-then' }
    if (edge.label === 'Else') return { kind: 'insert', path: target.path, position: 'into-else' }
    if (edge.label === 'Yes') return { kind: 'insert', path: target.path, position: 'into-body' }
    // A branch body (or loop body) flowing into its merge: place after the control.
    return { kind: 'insert', path: target.path, position: 'after' }
  }

  if (target.kind === 'end') {
    if (source.path) return { kind: 'insert', path: source.path, position: 'after' }
    // Empty function: start connects straight to end.
    return { kind: 'append' }
  }

  if (!target.path) return null
  return { kind: 'insert', path: target.path, position: 'before' }
}
