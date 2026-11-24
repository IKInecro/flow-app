import type { Expr } from '../lang/ast'
import { callBuiltin, isBuiltin } from '../lang/builtins'
import { applyBinary, applyUnary, evaluateValue } from '../lang/evaluate'
import { parseExpression } from '../lang/parser'
import {
  RuntimeFault,
  asBoolean,
  asInteger,
  asScalar,
  coerce,
  convertInput,
  scalar,
  toStr,
  type EvalContext,
  type ScalarValue,
  type Value,
} from '../lang/values'
import { checkProgram } from '../lang/validate'
import { getFunction } from '../model/program'
import type { FunctionDef, LValue, Program, ScalarType, Stmt } from '../model/types'
import type { FrameSnapshot, RuntimeError, RuntimeEvent, VariableSnapshot } from './events'

export interface InterpreterOptions {
  ignoreBreakpoints?: boolean
  maxDepth?: number
  random?: (max: number) => number
}

interface Frame {
  fn: FunctionDef
  locals: Map<string, Value>
}

function zero(type: ScalarType): ScalarValue {
  if (type === 'Integer') return scalar('Integer', 0)
  if (type === 'Real') return scalar('Real', 0)
  if (type === 'Boolean') return scalar('Boolean', false)
  return scalar('String', '')
}

function makeFrame(fn: FunctionDef): Frame {
  return { fn, locals: new Map() }
}

function hasUserCall(expr: Expr): boolean {
  switch (expr.kind) {
    case 'call':
      return !isBuiltin(expr.name) || expr.args.some(hasUserCall)
    case 'unary':
      return hasUserCall(expr.operand)
    case 'binary':
      return hasUserCall(expr.left) || hasUserCall(expr.right)
    case 'index':
      return hasUserCall(expr.index)
    default:
      return false
  }
}

export function createInterpreter(
  program: Program,
  options: InterpreterOptions = {},
): AsyncGenerator<RuntimeEvent, void, string> {
  return run(program, options)
}

async function* run(
  program: Program,
  options: InterpreterOptions,
): AsyncGenerator<RuntimeEvent, void, string> {
  const frames: Frame[] = []
  const maxDepth = options.maxDepth ?? 100
  const random = options.random ?? Math.random
  const parsed = new Map<string, Expr>()
  let currentPath = ''

  const diagnostics = checkProgram(program).filter((item) => item.severity === 'error')
  if (diagnostics.length > 0) {
    const first = diagnostics[0]
    yield {
      type: 'error',
      error: {
        message: first.message,
        path: first.path,
        function: first.function,
        callStack: [first.function],
      },
    }
    yield { type: 'done' }
    return
  }

  const main = getFunction(program, 'Main')
  if (!main) {
    yield {
      type: 'error',
      error: { message: 'Function Main tidak ditemukan.', path: '', function: 'Main', callStack: [] },
    }
    yield { type: 'done' }
    return
  }

  function parse(source: string): Expr {
    const cached = parsed.get(source)
    if (cached) return cached
    const result = parseExpression(source)
    if (!result.ok) throw new RuntimeFault(result.error.message, currentPath)
    parsed.set(source, result.expr)
    return result.expr
  }

  function contextFor(frame: Frame): EvalContext {
    return {
      lookup: (name) => frame.locals.get(name.toLowerCase()),
      callFunction: () => {
        throw new RuntimeFault('Pemanggilan fungsi tidak sinkron.', currentPath)
      },
      random,
    }
  }

  function snapshot(): FrameSnapshot[] {
    return frames.map((frame) => ({
      functionName: frame.fn.name,
      variables: Array.from(frame.locals.entries()).map(([name, value]): VariableSnapshot => {
        if (value.kind === 'array') {
          return {
            name,
            type: value.elementType,
            value: '',
            arrayItems: value.items.map((item, index) => ({ index, value: toStr(item) })),
          }
        }
        return { name, type: value.type, value: toStr(value) }
      }),
    }))
  }

  function runtimeError(error: unknown): RuntimeError {
    const frame = frames.at(-1)
    return {
      message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menjalankan program.',
      path: error instanceof RuntimeFault && error.path ? error.path : currentPath,
      function: frame?.fn.name ?? 'Main',
      callStack: frames.map((item) => item.fn.name),
    }
  }

  function targetType(frame: Frame, target: LValue): ScalarType {
    const value = frame.locals.get(target.name.toLowerCase())
    if (!value) throw new RuntimeFault(`Variabel "${target.name}" belum dideklarasi.`, currentPath)
    if (target.index !== undefined) {
      if (value.kind !== 'array') throw new RuntimeFault(`"${target.name}" bukan array.`, currentPath)
      return value.elementType
    }
    if (value.kind === 'array') throw new RuntimeFault(`Array "${target.name}" butuh index.`, currentPath)
    return value.type
  }

  async function* writeTarget(
    frame: Frame,
    target: LValue,
    value: Value,
  ): AsyncGenerator<RuntimeEvent, void, string> {
    const key = target.name.toLowerCase()
    const container = frame.locals.get(key)
    if (!container) throw new RuntimeFault(`Variabel "${target.name}" belum dideklarasi.`, currentPath)

    if (target.index !== undefined) {
      if (container.kind !== 'array') {
        throw new RuntimeFault(`"${target.name}" bukan array.`, currentPath)
      }
      const index = asInteger(asScalar(yield* evalValueAsync(parse(target.index), frame)))
      if (index < 0 || index >= container.items.length) {
        throw new RuntimeFault(`Index ${index} di luar batas array "${target.name}".`, currentPath)
      }
      const element = coerce(asScalar(value), container.elementType)
      container.items[index] = element
      return
    }

    if (container.kind === 'array') {
      throw new RuntimeFault(`Array "${target.name}" butuh index.`, currentPath)
    }
    frame.locals.set(key, coerce(asScalar(value), container.type))
  }

  async function* evalValueAsync(
    expr: Expr,
    frame: Frame,
  ): AsyncGenerator<RuntimeEvent, Value, string> {
    if (!hasUserCall(expr)) return evaluateValue(expr, contextFor(frame))

    switch (expr.kind) {
      case 'identifier': {
        const value = frame.locals.get(expr.name.toLowerCase())
        if (!value) throw new RuntimeFault(`Variabel "${expr.name}" belum dideklarasi.`, currentPath)
        return value
      }
      case 'index': {
        const container = frame.locals.get(expr.name.toLowerCase())
        if (!container) throw new RuntimeFault(`Variabel "${expr.name}" belum dideklarasi.`, currentPath)
        if (container.kind !== 'array') throw new RuntimeFault(`"${expr.name}" bukan array.`, currentPath)
        const index = Math.trunc(
          Number(asScalar(yield* evalValueAsync(expr.index, frame)).value),
        )
        if (index < 0 || index >= container.items.length) {
          throw new RuntimeFault(`Index ${index} di luar batas array "${expr.name}".`, currentPath)
        }
        return container.items[index]
      }
      case 'unary': {
        const value = asScalar(yield* evalValueAsync(expr.operand, frame))
        return applyUnary(expr.op, value)
      }
      case 'binary': {
        if (expr.op === 'and' || expr.op === 'or') {
          const left = asBoolean(asScalar(yield* evalValueAsync(expr.left, frame)))
          if (expr.op === 'and' && !left) return scalar('Boolean', false)
          if (expr.op === 'or' && left) return scalar('Boolean', true)
          const right = asBoolean(asScalar(yield* evalValueAsync(expr.right, frame)))
          return scalar('Boolean', right)
        }
        const left = asScalar(yield* evalValueAsync(expr.left, frame))
        const right = asScalar(yield* evalValueAsync(expr.right, frame))
        return applyBinary(expr.op, left, right)
      }
      case 'call': {
        const args: Value[] = []
        for (const arg of expr.args) args.push(yield* evalValueAsync(arg, frame))
        if (isBuiltin(expr.name)) return callBuiltin(expr.name, args, contextFor(frame))
        const fn = getFunction(program, expr.name)
        if (!fn) throw new RuntimeFault(`Function "${expr.name}" tidak ditemukan.`, currentPath)
        const result = yield* callFunction(fn, args, currentPath)
        return result ?? zero('Integer')
      }
      default:
        return evaluateValue(expr, contextFor(frame))
    }
  }

  async function* evalScalarAsync(
    source: string,
    frame: Frame,
  ): AsyncGenerator<RuntimeEvent, ScalarValue, string> {
    return asScalar(yield* evalValueAsync(parse(source), frame))
  }

  async function* callFunction(
    fn: FunctionDef,
    args: Value[],
    callPath: string,
  ): AsyncGenerator<RuntimeEvent, ScalarValue | undefined, string> {
    if (frames.length >= maxDepth) {
      throw new RuntimeFault(`Batas rekursi tercapai (${maxDepth}).`, callPath)
    }
    const frame = makeFrame(fn)
    fn.params.forEach((param, index) => {
      const arg = args[index]
      if (param.isArray) {
        if (!arg || arg.kind !== 'array') {
          throw new RuntimeFault(`Argumen ${index + 1} ${fn.name} harus array.`, callPath)
        }
        frame.locals.set(param.name.toLowerCase(), {
          kind: 'array',
          elementType: param.type,
          items: arg.items.map((item) => ({ ...item })),
        })
      } else {
        frame.locals.set(
          param.name.toLowerCase(),
          coerce(asScalar(arg ?? zero(param.type)), param.type),
        )
      }
    })

    frames.push(frame)
    yield { type: 'callEnter', function: fn.name, args, path: callPath }
    yield* execBody(fn.body, '', frame)

    let result: ScalarValue | undefined
    if (fn.returnType !== 'None') {
      const type = fn.returnType as ScalarType
      const raw = fn.returnVariable
        ? frame.locals.get(fn.returnVariable.toLowerCase())
        : undefined
      result = raw ? coerce(asScalar(raw), type) : zero(type)
    }
    frames.pop()
    yield {
      type: 'callExit',
      function: fn.name,
      ...(result ? { returnValue: result } : {}),
    }
    return result
  }

  async function* execBody(
    body: Stmt[],
    basePath: string,
    frame: Frame,
  ): AsyncGenerator<RuntimeEvent, void, string> {
    for (let index = 0; index < body.length; index += 1) {
      const path = basePath ? `${basePath}/${index}` : String(index)
      yield* execStmt(body[index], path, frame)
    }
  }

  async function* execStmt(
    stmt: Stmt,
    path: string,
    frame: Frame,
  ): AsyncGenerator<RuntimeEvent, void, string> {
    currentPath = path
    yield { type: 'nodeEnter', path, function: frame.fn.name }

    switch (stmt.kind) {
      case 'declare': {
        for (const name of stmt.names) {
          if (stmt.isArray) {
            const size = asInteger(asScalar(yield* evalScalarAsync(stmt.size, frame)))
            if (size < 0) throw new RuntimeFault('Ukuran array tidak boleh negatif.', path)
            const elementType = stmt.type === 'None' ? 'Integer' : (stmt.type as ScalarType)
            frame.locals.set(name.toLowerCase(), {
              kind: 'array',
              elementType,
              items: Array.from({ length: size }, () => zero(elementType)),
            })
          } else {
            const type = stmt.type === 'None' ? 'Integer' : (stmt.type as ScalarType)
            frame.locals.set(name.toLowerCase(), zero(type))
          }
        }
        break
      }
      case 'assign': {
        const value = yield* evalValueAsync(parse(stmt.expression), frame)
        yield* writeTarget(frame, stmt.target, value)
        break
      }
      case 'input': {
        const expected = targetType(frame, stmt.variable)
        let accepted: ScalarValue | undefined
        while (!accepted) {
          const text: string = yield {
            type: 'inputRequest',
            variable: stmt.variable.name,
            expectedType: expected,
          }
          try {
            accepted = convertInput(String(text ?? ''), expected)
          } catch (error) {
            yield {
              type: 'inputError',
              message: error instanceof Error ? error.message : 'Input tidak valid.',
              path,
            }
          }
        }
        yield { type: 'inputAccept', value: toStr(accepted) }
        yield* writeTarget(frame, stmt.variable, accepted)
        break
      }
      case 'output': {
        const value = asScalar(yield* evalValueAsync(parse(stmt.expression), frame))
        yield { type: 'output', text: toStr(value), newline: stmt.newline, path }
        break
      }
      case 'if': {
        const condition = asBoolean(asScalar(yield* evalScalarAsync(stmt.condition, frame)))
        yield* execBody(condition ? stmt.then : stmt.else, `${path}/${condition ? 'then' : 'else'}`, frame)
        break
      }
      case 'while': {
        while (asBoolean(asScalar(yield* evalScalarAsync(stmt.condition, frame)))) {
          yield* execBody(stmt.body, `${path}/body`, frame)
        }
        break
      }
      case 'do': {
        do {
          yield* execBody(stmt.body, `${path}/body`, frame)
        } while (asBoolean(asScalar(yield* evalScalarAsync(stmt.condition, frame))))
        break
      }
      case 'for': {
        const container = frame.locals.get(stmt.variable.toLowerCase())
        if (!container || container.kind !== 'scalar') {
          throw new RuntimeFault(`Variabel For "${stmt.variable}" tidak valid.`, path)
        }
        const start = asInteger(asScalar(yield* evalScalarAsync(stmt.start, frame)))
        const end = asInteger(asScalar(yield* evalScalarAsync(stmt.end, frame)))
        const step = Math.abs(asInteger(asScalar(yield* evalScalarAsync(stmt.step, frame))))
        if (step === 0) throw new RuntimeFault('Step For tidak boleh 0.', path)
        const direction = stmt.direction === 'dec' ? -1 : 1
        for (let value = start; direction > 0 ? value <= end : value >= end; value += step * direction) {
          frame.locals.set(stmt.variable.toLowerCase(), scalar('Integer', value))
          yield* execBody(stmt.body, `${path}/body`, frame)
        }
        break
      }
      case 'call': {
        const fn = getFunction(program, stmt.functionName)
        if (!fn) throw new RuntimeFault(`Function "${stmt.functionName}" tidak ditemukan.`, path)
        const args: Value[] = []
        for (const source of stmt.args) args.push(yield* evalValueAsync(parse(source), frame))
        yield* callFunction(fn, args, path)
        break
      }
      case 'breakpoint': {
        if (options.ignoreBreakpoints) break
        if (stmt.condition) {
          const condition = asBoolean(asScalar(yield* evalScalarAsync(stmt.condition, frame)))
          if (!condition) break
        }
        yield { type: 'breakpoint', path }
        break
      }
      case 'comment':
      case 'turtle':
      case 'file':
      case 'unsupported':
        break
    }

    yield { type: 'snapshot', frames: snapshot() }
    yield { type: 'nodeExit', path }
  }

  try {
    const frame = makeFrame(main)
    frames.push(frame)
    yield { type: 'start', function: 'Main' }
    yield* execBody(main.body, '', frame)
    frames.pop()
    yield { type: 'done' }
  } catch (error) {
    yield { type: 'error', error: runtimeError(error) }
    yield { type: 'done' }
  }
}
