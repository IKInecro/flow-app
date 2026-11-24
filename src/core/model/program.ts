import type { FunctionDef, Program, Stmt, StmtKind } from './types'

export { walkStmts } from './walk'

export type InsertPosition = 'before' | 'after' | 'into-then' | 'into-else' | 'into-body'

const defaults: Record<StmtKind, () => Stmt> = {
  declare: () => ({ kind: 'declare', names: [], type: 'Integer', isArray: false, size: '' }),
  assign: () => ({ kind: 'assign', target: { name: '' }, expression: '' }),
  input: () => ({ kind: 'input', variable: { name: '' } }),
  output: () => ({ kind: 'output', expression: '', newline: true }),
  if: () => ({ kind: 'if', condition: '', then: [], else: [] }),
  while: () => ({ kind: 'while', condition: '', body: [] }),
  do: () => ({ kind: 'do', condition: '', body: [] }),
  for: () => ({
    kind: 'for',
    variable: 'i',
    start: '0',
    end: '0',
    step: '1',
    direction: 'inc',
    body: [],
  }),
  call: () => ({ kind: 'call', functionName: '', args: [] }),
  comment: () => ({ kind: 'comment', text: '' }),
  breakpoint: () => ({ kind: 'breakpoint' }),
  turtle: () => ({ kind: 'turtle', op: 'forward', fields: {} }),
  file: () => ({ kind: 'file', op: 'open', fields: {} }),
  unsupported: () => ({ kind: 'unsupported', rawXml: '', label: 'Unsupported' }),
}

export function createStmt(kind: StmtKind): Stmt {
  return defaults[kind]()
}

export function createProgram(name = ''): Program {
  const main: FunctionDef = {
    name: 'Main',
    returnType: 'None',
    returnVariable: '',
    params: [],
    body: [],
  }
  return {
    fileVersion: '4.2',
    meta: { name, authors: '', about: '' },
    functions: [main],
  }
}

export function getFunction(program: Program, name: string): FunctionDef | undefined {
  const needle = name.toLowerCase()
  return program.functions.find((fn) => fn.name.toLowerCase() === needle)
}

function updateFunction(
  program: Program,
  name: string,
  updater: (fn: FunctionDef) => FunctionDef,
): Program {
  const needle = name.toLowerCase()
  let touched = false
  const functions = program.functions.map((fn) => {
    if (fn.name.toLowerCase() !== needle) return fn
    touched = true
    return updater(fn)
  })
  return touched ? { ...program, functions } : program
}

function bodyOf(stmt: Stmt, key: 'then' | 'else' | 'body'): Stmt[] | null {
  if (stmt.kind === 'if' && (key === 'then' || key === 'else')) return stmt[key]
  if ((stmt.kind === 'while' || stmt.kind === 'do' || stmt.kind === 'for') && key === 'body') {
    return stmt.body
  }
  return null
}

function withBody(stmt: Stmt, key: 'then' | 'else' | 'body', body: Stmt[]): Stmt {
  return { ...stmt, [key]: body } as Stmt
}

function mutateBodyList(
  body: Stmt[],
  parts: string[],
  updater: (body: Stmt[]) => Stmt[],
): Stmt[] {
  if (parts.length === 0) return updater(body)
  const index = Number(parts[0])
  const stmt = body[index]
  const key = parts[1]
  if (!stmt || (key !== 'then' && key !== 'else' && key !== 'body')) {
    throw new Error(`Invalid statement path at segment ${parts[0]}`)
  }
  const inner = bodyOf(stmt, key)
  if (!inner) throw new Error(`Statement ${stmt.kind} has no ${key} block`)
  const rest = parts.slice(2)
  const nextInner = rest.length === 0 ? updater(inner) : mutateBodyList(inner, rest, updater)
  return body.map((candidate, i) => (i === index ? withBody(stmt, key, nextInner) : candidate))
}

/**
 * Path examples: `0`, `0/then/1`, `2/body/0`.
 * A body path is a statement path with the trailing index removed, or a
 * trailing block marker (`0/then`, `2/body`), or empty for the root body.
 */
export function mutateBody(
  program: Program,
  functionName: string,
  bodyPath: string,
  updater: (body: Stmt[]) => Stmt[],
): Program {
  const parts = bodyPath === '' ? [] : bodyPath.split('/')
  return updateFunction(program, functionName, (fn) => ({
    ...fn,
    body: mutateBodyList(fn.body, parts, updater),
  }))
}

export function appendStmt(program: Program, functionName: string, stmt: Stmt): Program {
  return mutateBody(program, functionName, '', (body) => [...body, stmt])
}

export function insertStmt(
  program: Program,
  functionName: string,
  targetPath: string,
  position: InsertPosition,
  stmt: Stmt,
): Program {
  const found = findStmt(program, functionName, targetPath)
  if (!found) return program

  if (position === 'before' || position === 'after') {
    const parentPath = parentPathOf(targetPath)
    return mutateBody(program, functionName, parentPath, (body) => {
      const next = body.slice()
      next.splice(found.index + (position === 'after' ? 1 : 0), 0, stmt)
      return next
    })
  }

  const key = position === 'into-then' ? 'then' : position === 'into-else' ? 'else' : 'body'
  if (!bodyOf(found.stmt, key)) return program
  return mutateBody(program, functionName, `${targetPath}/${key}`, (body) => [...body, stmt])
}

export function replaceStmt(
  program: Program,
  functionName: string,
  path: string,
  stmt: Stmt,
): Program {
  const found = findStmt(program, functionName, path)
  if (!found) return program
  return mutateBody(program, functionName, parentPathOf(path), (body) =>
    body.map((candidate, index) => (index === found.index ? stmt : candidate)),
  )
}

export function removeStmt(program: Program, functionName: string, path: string): Program {
  const found = findStmt(program, functionName, path)
  if (!found) return program
  return mutateBody(program, functionName, parentPathOf(path), (body) =>
    body.filter((_, index) => index !== found.index),
  )
}

export interface FoundStmt {
  stmt: Stmt
  parentBody: Stmt[]
  index: number
}

export function findStmt(program: Program, functionName: string, path: string): FoundStmt | null {
  const fn = getFunction(program, functionName)
  if (!fn) return null
  return resolveInBody(fn.body, path.split('/'))
}

function resolveInBody(body: Stmt[], parts: string[]): FoundStmt | null {
  if (parts.length === 0) return null
  const index = Number(parts[0])
  const stmt = body[index]
  if (!stmt) return null
  if (parts.length === 1) return { stmt, parentBody: body, index }
  const key = parts[1]
  if (key !== 'then' && key !== 'else' && key !== 'body') return null
  const inner = bodyOf(stmt, key)
  if (!inner) return null
  return resolveInBody(inner, parts.slice(2))
}

function parentPathOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

export function stmtPathId(functionName: string, path: string): string {
  return `${functionName}:${path}`
}

export function formatStmt(stmt: Stmt): string {
  switch (stmt.kind) {
    case 'declare': {
      const names = stmt.names.length ? stmt.names.join(', ') : '?'
      const suffix = stmt.isArray ? `[${stmt.size || '?'}]` : ''
      return `${stmt.type}${suffix} ${names}`
    }
    case 'assign':
      return `${stmt.target.name}${stmt.target.index ? `[${stmt.target.index}]` : ''} ← ${stmt.expression || '?'}`
    case 'input':
      return `Input ${stmt.variable.name || '?'}`
    case 'output':
      return `Output ${stmt.expression || '?'}`
    case 'if':
      return `If ${stmt.condition || '?'}`
    case 'while':
      return `While ${stmt.condition || '?'}`
    case 'do':
      return `Do while ${stmt.condition || '?'}`
    case 'for':
      return `For ${stmt.variable} = ${stmt.start} to ${stmt.end}`
    case 'call':
      return `Call ${stmt.functionName || '?'}(${stmt.args.join(', ')})`
    case 'comment':
      return `// ${stmt.text}`
    case 'breakpoint':
      return stmt.condition ? `Breakpoint if ${stmt.condition}` : 'Breakpoint'
    case 'turtle':
      return `Turtle ${stmt.op}`
    case 'file':
      return `File ${stmt.op}`
    case 'unsupported':
      return stmt.label
  }
}
