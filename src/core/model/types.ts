export type FlowType = 'None' | 'Integer' | 'Real' | 'String' | 'Boolean'
export type ScalarType = Exclude<FlowType, 'None'>

export interface Param {
  name: string
  type: ScalarType
  isArray: boolean
}

export interface LValue {
  name: string
  index?: string
}

export type Stmt =
  | { kind: 'declare'; names: string[]; type: FlowType; isArray: boolean; size: string }
  | { kind: 'assign'; target: LValue; expression: string }
  | { kind: 'input'; variable: LValue }
  | { kind: 'output'; expression: string; newline: boolean }
  | { kind: 'if'; condition: string; then: Stmt[]; else: Stmt[] }
  | { kind: 'while'; condition: string; body: Stmt[] }
  | { kind: 'do'; condition: string; body: Stmt[] }
  | {
      kind: 'for'
      variable: string
      start: string
      end: string
      step: string
      direction: 'inc' | 'dec'
      body: Stmt[]
    }
  | { kind: 'call'; functionName: string; args: string[] }
  | { kind: 'comment'; text: string }
  | { kind: 'breakpoint'; condition?: string }
  | { kind: 'turtle'; op: string; fields: Record<string, string> }
  | { kind: 'file'; op: string; fields: Record<string, string> }
  | { kind: 'unsupported'; rawXml: string; label: string }

export type StmtKind = Stmt['kind']

export interface ProgramMeta {
  name: string
  authors: string
  about: string
  saved?: string
  created?: string
  edited?: string[]
}

export interface FunctionDef {
  name: string
  returnType: FlowType
  returnVariable: string
  params: Param[]
  body: Stmt[]
}

export interface Program {
  fileVersion: string
  meta: ProgramMeta
  functions: FunctionDef[]
  unknown?: string[]
}

export interface Diagnostic {
  path: string
  function: string
  severity: 'error' | 'warning'
  message: string
  span?: { start: number; end: number }
}
