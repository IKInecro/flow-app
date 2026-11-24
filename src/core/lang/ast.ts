export type UnaryOp = '-' | '!' | 'not' | '¬'

export type BinaryOp =
  | '^'
  | '↑'
  | '*'
  | '×'
  | '/'
  | '÷'
  | '%'
  | 'mod'
  | '+'
  | '-'
  | '&'
  | '>'
  | '<'
  | '>='
  | '≥'
  | '<='
  | '≤'
  | '=='
  | '='
  | '!='
  | '<>'
  | '≠'
  | 'and'
  | '&&'
  | '∧'
  | 'or'
  | '||'
  | '∨'

export type Expr =
  | { kind: 'number'; value: number; isInt: boolean }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'identifier'; name: string }
  | { kind: 'unary'; op: UnaryOp; operand: Expr }
  | { kind: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  | { kind: 'call'; name: string; args: Expr[] }
  | { kind: 'index'; name: string; index: Expr }

export type ParseResult<T> =
  | { ok: true; expr: T }
  | { ok: false; error: { message: string; position: number } }

const CANONICAL: Partial<Record<BinaryOp, string>> = {
  '≥': '>=',
  '≤': '<=',
  '≠': '!=',
  '<>': '!=',
  '=': '==',
  '∧': 'and',
  '&&': 'and',
  '∨': 'or',
  '||': 'or',
  '↑': '^',
  '×': '*',
  '÷': '/',
  mod: '%',
}

export function canonicalOp(op: BinaryOp): string {
  return CANONICAL[op] ?? op
}
