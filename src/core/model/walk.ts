import type { Stmt } from './types'

/**
 * Visit statements depth-first in source order. `basePath` is the path of the
 * body list itself (empty string for a function body); children are joined
 * with the container key (`then`, `else`, `body`).
 */
export function walkStmts(
  body: Stmt[],
  basePath: string,
  visit: (stmt: Stmt, path: string) => void,
): void {
  body.forEach((stmt, index) => {
    const path = basePath ? `${basePath}/${index}` : String(index)
    visit(stmt, path)
    if (stmt.kind === 'if') {
      walkStmts(stmt.then, `${path}/then`, visit)
      walkStmts(stmt.else, `${path}/else`, visit)
    } else if (stmt.kind === 'while' || stmt.kind === 'do' || stmt.kind === 'for') {
      walkStmts(stmt.body, `${path}/body`, visit)
    }
  })
}
