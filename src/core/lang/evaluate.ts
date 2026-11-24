import type { Expr, UnaryOp } from './ast'
import { callBuiltin, isBuiltin } from './builtins'
import { parseExpression } from './parser'
import {
  RuntimeFault,
  asBoolean,
  asNumber,
  asScalar,
  scalar,
  toStr,
  type EvalContext,
  type ScalarValue,
  type Value,
} from './values'

export type { EvalContext } from './values'

function numericType(left: ScalarValue, right: ScalarValue): 'Integer' | 'Real' {
  return left.type === 'Integer' && right.type === 'Integer' ? 'Integer' : 'Real'
}

function bothNumeric(left: ScalarValue, right: ScalarValue): boolean {
  return (
    (left.type === 'Integer' || left.type === 'Real') &&
    (right.type === 'Integer' || right.type === 'Real')
  )
}

function compare(op: string, left: ScalarValue, right: ScalarValue): boolean {
  if (bothNumeric(left, right)) {
    const a = asNumber(left)
    const b = asNumber(right)
    if (op === '>') return a > b
    if (op === '<') return a < b
    if (op === '>=') return a >= b
    if (op === '<=') return a <= b
    if (op === '==') return a === b
    return a !== b
  }
  if (left.type === 'String' && right.type === 'String') {
    const a = toStr(left)
    const b = toStr(right)
    if (op === '>') return a > b
    if (op === '<') return a < b
    if (op === '>=') return a >= b
    if (op === '<=') return a <= b
    if (op === '==') return a === b
    return a !== b
  }
  if (left.type === 'Boolean' && right.type === 'Boolean') {
    if (op === '==') return left.value === right.value
    if (op === '!=') return left.value !== right.value
    throw new RuntimeFault(`Operator ${op} is not valid for Boolean.`)
  }
  throw new RuntimeFault(`Cannot compare ${left.type} with ${right.type}.`)
}

export function applyUnary(op: UnaryOp, value: ScalarValue): ScalarValue {
  if (op === 'not' || op === '!' || op === '¬') {
    return scalar('Boolean', !asBoolean(value))
  }
  const number = asNumber(value)
  return scalar(value.type === 'Integer' ? 'Integer' : 'Real', -number)
}

export function applyBinary(op: string, left: ScalarValue, right: ScalarValue): ScalarValue {
  if (op === '&') return scalar('String', toStr(left) + toStr(right))

  if (op === 'and' || op === 'or') {
    const a = asBoolean(left)
    const b = asBoolean(right)
    return scalar('Boolean', op === 'and' ? a && b : a || b)
  }

  if (['>', '<', '>=', '<=', '==', '!='].includes(op)) {
    return scalar('Boolean', compare(op, left, right))
  }

  if (!bothNumeric(left, right)) throw new RuntimeFault(`Operator ${op} requires numbers.`)
  const a = asNumber(left)
  const b = asNumber(right)

  if (op === '+') return scalar(numericType(left, right), a + b)
  if (op === '-') return scalar(numericType(left, right), a - b)
  if (op === '*') return scalar(numericType(left, right), a * b)
  if (op === '/') {
    if (b === 0) throw new RuntimeFault('Division by zero.')
    return scalar('Real', a / b)
  }
  if (op === '%') {
    if (b === 0) throw new RuntimeFault('Modulo by zero.')
    return scalar(numericType(left, right), a % b)
  }
  if (op === '^') return scalar('Real', Math.pow(a, b))
  throw new RuntimeFault(`Unknown operator: ${op}.`)
}

export function evaluateValue(expr: Expr, ctx: EvalContext): Value {
  switch (expr.kind) {
    case 'number':
      return scalar(expr.isInt ? 'Integer' : 'Real', expr.value)
    case 'string':
      return scalar('String', expr.value)
    case 'boolean':
      return scalar('Boolean', expr.value)
    case 'identifier': {
      const value = ctx.lookup(expr.name)
      if (!value) throw new RuntimeFault(`Variable "${expr.name}" is not declared.`)
      return value
    }
    case 'index': {
      const container = ctx.lookup(expr.name)
      if (!container) throw new RuntimeFault(`Variable "${expr.name}" is not declared.`)
      if (container.kind !== 'array') throw new RuntimeFault(`"${expr.name}" is not an array.`)
      const index = Math.trunc(asNumber(evaluate(expr.index, ctx)))
      if (index < 0 || index >= container.items.length) {
        throw new RuntimeFault(`Index ${index} is out of bounds for array "${expr.name}".`)
      }
      return container.items[index]
    }
    case 'unary':
      return applyUnary(expr.op, asScalar(evaluateValue(expr.operand, ctx)))
    case 'binary': {
      if (expr.op === 'and' || expr.op === 'or') {
        const left = asBoolean(asScalar(evaluateValue(expr.left, ctx)))
        if (expr.op === 'and' && !left) return scalar('Boolean', false)
        if (expr.op === 'or' && left) return scalar('Boolean', true)
        const right = asBoolean(asScalar(evaluateValue(expr.right, ctx)))
        return scalar('Boolean', right)
      }
      const left = asScalar(evaluateValue(expr.left, ctx))
      const right = asScalar(evaluateValue(expr.right, ctx))
      return applyBinary(expr.op, left, right)
    }
    case 'call': {
      const args = expr.args.map((arg) => evaluateValue(arg, ctx))
      if (isBuiltin(expr.name)) return callBuiltin(expr.name, args, ctx)
      return ctx.callFunction(expr.name, args)
    }
  }
}

export function evaluate(expr: Expr, ctx: EvalContext): ScalarValue {
  return asScalar(evaluateValue(expr, ctx))
}

export function evalExpression(source: string, ctx: EvalContext): ScalarValue {
  const parsed = parseExpression(source)
  if (!parsed.ok) throw new RuntimeFault(parsed.error.message)
  return evaluate(parsed.expr, ctx)
}
