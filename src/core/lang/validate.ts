import { walkStmts } from '../model/walk'
import type {
  Diagnostic,
  FunctionDef,
  LValue,
  Program,
  ScalarType,
  Stmt,
} from '../model/types'
import type { Expr } from './ast'
import { BUILTIN_ARITY, builtinReturnType, isBuiltin } from './builtins'
import { parseExpression } from './parser'

type TypeTag = ScalarType | 'Array'

interface SymbolInfo {
  type: ScalarType
  isArray: boolean
}

export function checkProgram(program: Program): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const functions = new Map<string, FunctionDef>()
  for (const fn of program.functions) {
    const key = fn.name.toLowerCase()
    if (functions.has(key)) {
      diagnostics.push({
        path: '',
        function: fn.name,
        severity: 'error',
        message: `Function "${fn.name}" duplikat.`,
      })
    }
    functions.set(key, fn)
  }

  const main = functions.get('main')
  if (!main) {
    diagnostics.push({
      path: '',
      function: 'Main',
      severity: 'error',
      message: 'Function Main tidak ditemukan.',
    })
    return diagnostics
  }

  for (const fn of program.functions) {
    const symbols = new Map<string, SymbolInfo>()

    for (const param of fn.params) {
      const key = param.name.toLowerCase()
      if (symbols.has(key)) {
        diagnostics.push({
          path: '',
          function: fn.name,
          severity: 'error',
          message: `Parameter "${param.name}" duplikat.`,
        })
      }
      symbols.set(key, { type: param.type, isArray: param.isArray })
    }

    walkStmts(fn.body, '', (stmt) => {
      if (stmt.kind !== 'declare') return
      for (const name of stmt.names) {
        const key = name.toLowerCase()
        if (symbols.has(key)) {
          diagnostics.push({
            path: '',
            function: fn.name,
            severity: 'error',
            message: `Variabel "${name}" sudah dideklarasi.`,
          })
        }
        if (stmt.type === 'None') {
          diagnostics.push({
            path: '',
            function: fn.name,
            severity: 'error',
            message: `Variabel "${name}" tidak boleh bertipe None.`,
          })
          continue
        }
        symbols.set(key, { type: stmt.type as ScalarType, isArray: stmt.isArray })
      }
    })

    const ctx = new ValidationContext(fn, symbols, functions, diagnostics)

    walkStmts(fn.body, '', (stmt, path) => {
      ctx.validateStatement(stmt, path)
    })
  }

  return diagnostics
}

class ValidationContext {
  private fn: FunctionDef
  private symbols: Map<string, SymbolInfo>
  private functions: Map<string, FunctionDef>
  private diagnostics: Diagnostic[]

  constructor(
    fn: FunctionDef,
    symbols: Map<string, SymbolInfo>,
    functions: Map<string, FunctionDef>,
    diagnostics: Diagnostic[],
  ) {
    this.fn = fn
    this.symbols = symbols
    this.functions = functions
    this.diagnostics = diagnostics
  }

  private error(message: string, path: string, span?: { start: number; end: number }): void {
    this.diagnostics.push({
      path,
      function: this.fn.name,
      severity: 'error',
      message,
      ...(span ? { span } : {}),
    })
  }

  private parse(source: string, path: string): Expr | null {
    if (!source.trim()) {
      this.error('Ekspresi kosong.', path)
      return null
    }
    const parsed = parseExpression(source)
    if (!parsed.ok) {
      this.error(parsed.error.message, path, {
        start: parsed.error.position,
        end: parsed.error.position + 1,
      })
      return null
    }
    return parsed.expr
  }

  private symbol(name: string): SymbolInfo | undefined {
    return this.symbols.get(name.toLowerCase())
  }

  private scalar(tag: TypeTag | null, path: string, label: string): TypeTag | null {
    if (tag === 'Array') {
      this.error(`${label} tidak boleh array tanpa index.`, path)
      return null
    }
    return tag
  }

  private numeric(tag: TypeTag | null, path: string, label: string): boolean {
    if (tag === null) return false
    if (tag !== 'Integer' && tag !== 'Real') {
      this.error(`${label} harus angka.`, path)
      return false
    }
    return true
  }

  private boolean(tag: TypeTag | null, path: string, label: string): boolean {
    if (tag === null) return false
    if (tag !== 'Boolean') {
      this.error(`${label} harus Boolean.`, path)
      return false
    }
    return true
  }

  private infer(expr: Expr, path: string): TypeTag | null {
    switch (expr.kind) {
      case 'number':
        return expr.isInt ? 'Integer' : 'Real'
      case 'string':
        return 'String'
      case 'boolean':
        return 'Boolean'
      case 'identifier': {
        const found = this.symbol(expr.name)
        if (!found) {
          this.error(`Variabel "${expr.name}" belum dideklarasi.`, path)
          return null
        }
        return found.isArray ? 'Array' : found.type
      }
      case 'index': {
        const found = this.symbol(expr.name)
        if (!found) {
          this.error(`Variabel "${expr.name}" belum dideklarasi.`, path)
          return null
        }
        if (!found.isArray) {
          this.error(`"${expr.name}" bukan array.`, path)
          return null
        }
        const index = this.infer(expr.index, path)
        if (index !== null) this.numeric(index, path, 'Index')
        return found.type
      }
      case 'unary': {
        const operand = this.infer(expr.operand, path)
        if (expr.op === '-' && operand !== null) {
          this.numeric(operand, path, 'Operator -')
          return operand
        }
        if (operand !== null) this.boolean(operand, path, `Operator ${expr.op}`)
        return 'Boolean'
      }
      case 'binary': {
        if (expr.op === '&') {
          this.infer(expr.left, path)
          this.infer(expr.right, path)
          return 'String'
        }
        if (expr.op === 'and' || expr.op === 'or') {
          this.boolean(this.infer(expr.left, path), path, `Operator ${expr.op}`)
          this.boolean(this.infer(expr.right, path), path, `Operator ${expr.op}`)
          return 'Boolean'
        }
        if (['>', '<', '>=', '<=', '==', '!='].includes(expr.op)) {
          const left = this.infer(expr.left, path)
          const right = this.infer(expr.right, path)
          if (left !== null && right !== null) {
            const comparable =
              (left === 'Integer' || left === 'Real') &&
                (right === 'Integer' || right === 'Real')
                ? true
                : left === right
            if (!comparable) {
              this.error(`Tidak bisa membandingkan ${left} dengan ${right}.`, path)
            }
          }
          return 'Boolean'
        }
        const left = this.infer(expr.left, path)
        const right = this.infer(expr.right, path)
        if (!this.numeric(left, path, `Operator ${expr.op}`)) return null
        if (!this.numeric(right, path, `Operator ${expr.op}`)) return null
        if (expr.op === '/' || expr.op === '^') return 'Real'
        return left === 'Integer' && right === 'Integer' ? 'Integer' : 'Real'
      }
      case 'call':
        return this.inferCall(expr, path)
    }
  }

  private inferCall(expr: Extract<Expr, { kind: 'call' }>, path: string): TypeTag | null {
    if (isBuiltin(expr.name)) {
      const expected = BUILTIN_ARITY[expr.name.toLowerCase()]
      if (expected !== undefined && expr.args.length !== expected) {
        this.error(`${expr.name} butuh ${expected} argumen, dapat ${expr.args.length}.`, path)
        return null
      }
      if (expr.name.toLowerCase() === 'size') {
        const arg = expr.args[0]
        if (!arg) return null
        const tag = this.infer(arg, path)
        if (tag !== 'Array') this.error('Size butuh array.', path)
        return 'Integer'
      }
      for (const arg of expr.args) {
        const tag = this.infer(arg, path)
        if (tag !== null) this.scalar(tag, path, `Argumen ${expr.name}`)
      }
      return builtinReturnType(expr.name) ?? 'Real'
    }

    const fn = this.functions.get(expr.name.toLowerCase())
    if (!fn) {
      this.error(`Function "${expr.name}" tidak ditemukan.`, path)
      return null
    }
    if (expr.args.length !== fn.params.length) {
      this.error(
        `${fn.name} butuh ${fn.params.length} argumen, dapat ${expr.args.length}.`,
        path,
      )
      return null
    }
    expr.args.forEach((arg, index) => {
      const tag = this.infer(arg, path)
      const param = fn.params[index]
      if (tag === null) return
      if (param.isArray && tag !== 'Array') {
        this.error(`Argumen ${index + 1} ${fn.name} harus array.`, path)
      } else if (!param.isArray && tag === 'Array') {
        this.error(`Argumen ${index + 1} ${fn.name} tidak boleh array.`, path)
      }
    })
    if (fn.returnType === 'None') {
      this.error(`${fn.name} tidak mengembalikan nilai (None).`, path)
      return null
    }
    return fn.returnType as ScalarType
  }

  private target(target: LValue, path: string, label: string): SymbolInfo | null {
    const found = this.symbol(target.name)
    if (!found) {
      this.error(`${label} "${target.name}" belum dideklarasi.`, path)
      return null
    }
    if (target.index !== undefined) {
      if (!found.isArray) {
        this.error(`"${target.name}" bukan array.`, path)
        return null
      }
      const index = this.parse(target.index, path)
      if (index) this.numeric(this.infer(index, path), path, 'Index')
      return found
    }
    if (found.isArray) {
      this.error(`Array "${target.name}" butuh index.`, path)
      return null
    }
    return found
  }

  validateStatement(stmt: Stmt, path: string): void {
    switch (stmt.kind) {
      case 'declare': {
        if (stmt.type === 'None') {
          this.error('Deklarasi tidak boleh bertipe None.', path)
        }
        if (stmt.names.length === 0) {
          this.error('Deklarasi butuh nama variabel.', path)
        }
        if (stmt.isArray) {
          if (!stmt.size.trim()) {
            this.error(`Array "${stmt.names.join(', ') || '?'}" butuh ukuran.`, path)
          } else {
            const size = this.parse(stmt.size, path)
            if (size) this.numeric(this.infer(size, path), path, 'Ukuran array')
          }
        }
        return
      }
      case 'assign': {
        this.target(stmt.target, path, 'Variabel')
        const expression = this.parse(stmt.expression, path)
        if (expression) this.scalar(this.infer(expression, path), path, 'Assignment')
        return
      }
      case 'input':
        this.target(stmt.variable, path, 'Variabel input')
        return
      case 'output': {
        const expression = this.parse(stmt.expression, path)
        if (expression) this.scalar(this.infer(expression, path), path, 'Output')
        return
      }
      case 'if':
      case 'while':
      case 'do': {
        const condition = this.parse(stmt.condition, path)
        if (condition) this.boolean(this.infer(condition, path), path, 'Kondisi')
        return
      }
      case 'for': {
        const variable = this.symbol(stmt.variable)
        if (!variable) {
          this.error(`Variabel "${stmt.variable}" belum dideklarasi.`, path)
        } else {
          if (variable.isArray) this.error('Variabel For tidak boleh array.', path)
          if (variable.type !== 'Integer') {
            this.error('Variabel For harus Integer.', path)
          }
        }
        for (const [label, source] of [
          ['Start', stmt.start],
          ['End', stmt.end],
          ['Step', stmt.step],
        ] as const) {
          const expr = this.parse(source, path)
          if (expr) this.numeric(this.infer(expr, path), path, label)
        }
        return
      }
      case 'call': {
        const fn = this.functions.get(stmt.functionName.toLowerCase())
        if (!fn) {
          this.error(`Function "${stmt.functionName}" tidak ditemukan.`, path)
          return
        }
        if (stmt.args.length !== fn.params.length) {
          this.error(
            `${fn.name} butuh ${fn.params.length} argumen, dapat ${stmt.args.length}.`,
            path,
          )
          return
        }
        stmt.args.forEach((source, index) => {
          const expr = this.parse(source, path)
          if (!expr) return
          const tag = this.infer(expr, path)
          const param = fn.params[index]
          if (tag === null) return
          if (param.isArray && tag !== 'Array') {
            this.error(`Argumen ${index + 1} ${fn.name} harus array.`, path)
          } else if (!param.isArray && tag === 'Array') {
            this.error(`Argumen ${index + 1} ${fn.name} tidak boleh array.`, path)
          }
        })
        return
      }
      case 'breakpoint': {
        if (stmt.condition) {
          const condition = this.parse(stmt.condition, path)
          if (condition) this.boolean(this.infer(condition, path), path, 'Breakpoint')
        }
        return
      }
      case 'comment':
      case 'turtle':
      case 'file':
      case 'unsupported':
        return
    }
  }
}
