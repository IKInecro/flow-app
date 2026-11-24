import { canonicalOp, type Expr } from '../lang/ast'
import { parseExpression } from '../lang/parser'
import { stmtPathId } from '../model/program'
import type { FunctionDef, LValue, Program, ScalarType, Stmt } from '../model/types'
import {
  sectionValue,
  type Template,
  type TemplateEntry,
} from './template'

interface Fragment {
  lines: string[]
  map: Record<string, number[]>
}

type Fields = Record<string, string | Fragment>

interface RenderContext {
  template: Template
  operators: Record<string, string>
  types: Record<string, string>
  literalString: string
  literalTrue: string
  literalFalse: string
  callSyntax: string
  indexSyntax: string
  variableSyntax: string
}

const INDENT = '  '
const EMPTY: Fragment = { lines: [], map: {} }

const OP_KEYS: Record<string, string> = {
  '+': 'plus',
  '-': 'minus',
  '*': 'times',
  '/': 'divide',
  '%': 'modulo',
  '^': 'power',
  '&': 'concat',
  '>': 'gt',
  '<': 'lt',
  '>=': 'gte',
  '<=': 'lte',
  '==': 'eq',
  '!=': 'neq',
  and: 'and',
  or: 'or',
}

const PRECEDENCE: Record<string, number> = {
  or: 1,
  and: 2,
  '>': 3,
  '<': 3,
  '>=': 3,
  '<=': 3,
  '==': 3,
  '!=': 3,
  '&': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
  '^': 8,
}

const UNARY_PRECEDENCE = 7
const ASSOCIATIVE = new Set(['+', '*', '&', 'and', 'or'])

function context(template: Template): RenderContext {
  const operatorEntries = template.sections.Operators?.entries ?? []
  const operators: Record<string, string> = {}
  for (const entry of operatorEntries) {
    if (entry.key !== 'line') operators[entry.key] = entry.value
  }
  const types: Record<string, string> = {}
  for (const entry of template.sections.Types?.entries ?? []) {
    if (entry.key !== 'line') types[entry.key] = entry.value
  }
  return {
    template,
    operators,
    types,
    literalString: sectionValue(template.sections, 'Literals', 'string') ?? '"{value}"',
    literalTrue: sectionValue(template.sections, 'Literals', 'true') ?? 'true',
    literalFalse: sectionValue(template.sections, 'Literals', 'false') ?? 'false',
    callSyntax: sectionValue(template.sections, 'Language', 'call') ?? '{name}({args})',
    indexSyntax: sectionValue(template.sections, 'Language', 'index') ?? '{name}[{index}]',
    variableSyntax: sectionValue(template.sections, 'Language', 'variable') ?? '{name}',
  }
}

function variableName(ctx: RenderContext, name: string): string {
  return ctx.variableSyntax.replace(/\{name\}/g, name)
}

function mappedType(ctx: RenderContext, type: ScalarType | 'None'): string {
  return ctx.types[type] ?? (type === 'None' ? '' : type)
}

function mappedOperator(ctx: RenderContext, op: string): string {
  const canonical = canonicalOp(op as Parameters<typeof canonicalOp>[0])
  return ctx.operators[OP_KEYS[canonical] ?? canonical] ?? canonical
}

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function applyStringFields(text: string, fields: Fields): string {
  let output = text.replace(/\{\{/g, '\u0000').replace(/\}\}/g, '\u0001')
  output = output.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name: string) => {
    if (name === 'space') return ' '
    if (name === 'pipe') return '|'
    const value = fields[name]
    return typeof value === 'string' ? value : match
  })
  return output.replace(/\u0000/g, '{').replace(/\u0001/g, '}')
}

function parse(source: string): Expr | null {
  const result = parseExpression(source)
  return result.ok ? result.expr : null
}

function renderLValue(ctx: RenderContext, value: LValue): string {
  if (value.index === undefined) return variableName(ctx, value.name)
  const index = parse(value.index)
  const rendered = index ? renderExpression(ctx, index) : value.index
  return ctx.indexSyntax
    .replace(/\{name\}/g, variableName(ctx, value.name))
    .replace(/\{index\}/g, rendered)
}

function renderExpression(ctx: RenderContext, expr: Expr): string {
  return renderNode(ctx, expr).text
}

function renderChild(
  ctx: RenderContext,
  expr: Expr,
  parentOp: string,
  side: 'left' | 'right',
): string {
  const rendered = renderNode(ctx, expr)
  const parentPrec = PRECEDENCE[parentOp] ?? 0
  let needs = false
  if (rendered.precedence < parentPrec) {
    needs = true
  } else if (rendered.precedence === parentPrec && rendered.binary) {
    if (parentOp === '^') {
      needs = side === 'left'
    } else if (!ASSOCIATIVE.has(parentOp)) {
      needs = true
    }
  }
  return needs ? `(${rendered.text})` : rendered.text
}

function renderNode(
  ctx: RenderContext,
  expr: Expr,
): { text: string; precedence: number; binary: boolean } {
  switch (expr.kind) {
    case 'number':
      return { text: String(expr.value), precedence: 9, binary: false }
    case 'string':
      return {
        text: ctx.literalString.replace(/\{value\}/g, escapeString(expr.value)),
        precedence: 9,
        binary: false,
      }
    case 'boolean':
      return {
        text: expr.value ? ctx.literalTrue : ctx.literalFalse,
        precedence: 9,
        binary: false,
      }
    case 'identifier':
      return { text: variableName(ctx, expr.name), precedence: 9, binary: false }
    case 'index': {
      const index = renderExpression(ctx, expr.index)
      return {
        text: ctx.indexSyntax.replace(/\{name\}/g, expr.name).replace(/\{index\}/g, index),
        precedence: 9,
        binary: false,
      }
    }
    case 'call': {
      const args = expr.args.map((arg) => renderExpression(ctx, arg)).join(', ')
      return {
        text: ctx.callSyntax.replace(/\{name\}/g, expr.name).replace(/\{args\}/g, args),
        precedence: 9,
        binary: false,
      }
    }
    case 'unary': {
      const canonical = expr.op === 'not' || expr.op === '!' || expr.op === '¬' ? 'not' : '-'
      const symbol = canonical === 'not' ? mappedOperator(ctx, 'not') : mappedOperator(ctx, '-')
      const operandNode = renderNode(ctx, expr.operand)
      const operand =
        operandNode.precedence < UNARY_PRECEDENCE ? `(${operandNode.text})` : operandNode.text
      const spaced = /^[A-Za-z]+$/.test(symbol) ? `${symbol} ${operand}` : `${symbol}${operand}`
      return { text: spaced, precedence: UNARY_PRECEDENCE, binary: false }
    }
    case 'binary': {
      const canonical = canonicalOp(expr.op)
      const symbol = mappedOperator(ctx, canonical)
      const left = renderChild(ctx, expr.left, canonical, 'left')
      const right = renderChild(ctx, expr.right, canonical, 'right')
      return {
        text: `${left} ${symbol} ${right}`,
        precedence: PRECEDENCE[canonical] ?? 0,
        binary: true,
      }
    }
  }
}

function flagsMatch(entry: TemplateEntry, flags: Set<string>): boolean {
  return (
    entry.flags.include.every((flag) => flags.has(flag)) &&
    entry.flags.exclude.every((flag) => !flags.has(flag))
  )
}

function renderSection(
  ctx: RenderContext,
  sectionName: string,
  fields: Fields,
  flags: Set<string>,
  stmtKey?: string,
): Fragment {
  const entries = ctx.template.sections[sectionName]?.entries
  if (!entries) return EMPTY

  const lines: string[] = []
  const map: Record<string, number[]> = {}
  let indent = 0

  for (const entry of entries) {
    if (!flagsMatch(entry, flags)) continue
    if (entry.key === 'indent') {
      indent += Math.max(1, Number(entry.value) || 1)
      continue
    }
    if (entry.key === 'dedent') {
      indent = Math.max(0, indent - Math.max(1, Number(entry.value) || 1))
      continue
    }
    if (entry.key !== 'line') continue

    const prefix = INDENT.repeat(indent)
    const exact = /^\{([A-Za-z_][A-Za-z0-9_]*)\}$/.exec(entry.value.trim())
    if (exact) {
      const field = fields[exact[1]]
      if (field && typeof field === 'object') {
        const offset = lines.length + 1
        for (const nested of field.lines) lines.push(`${prefix}${nested}`)
        for (const [path, numbers] of Object.entries(field.map)) {
          map[path] = [...(map[path] ?? []), ...numbers.map((number) => number + offset - 1)]
        }
        continue
      }
    }

    const text = applyStringFields(entry.value, fields)
    if (!text) continue
    const parts = text.split('\n')
    for (const part of parts) {
      lines.push(`${prefix}${part}`)
      if (stmtKey) map[stmtKey] = [...(map[stmtKey] ?? []), lines.length]
    }
  }

  return { lines, map }
}

function appendFragment(target: Fragment, source: Fragment): void {
  const offset = target.lines.length
  target.lines.push(...source.lines)
  for (const [path, numbers] of Object.entries(source.map)) {
    target.map[path] = [...(target.map[path] ?? []), ...numbers.map((number) => number + offset)]
  }
}

function renderBody(
  ctx: RenderContext,
  body: Stmt[],
  functionName: string,
  basePath: string,
  flags: Set<string>,
): Fragment {
  const result: Fragment = { lines: [], map: {} }
  body.forEach((stmt, index) => {
    const path = basePath ? `${basePath}/${index}` : String(index)
    appendFragment(result, renderStatement(ctx, stmt, functionName, path, flags))
  })
  return result
}

function nested(
  ctx: RenderContext,
  body: Stmt[],
  functionName: string,
  path: string,
  key: 'then' | 'else' | 'body',
  flags: Set<string>,
): Fragment {
  return renderBody(ctx, body, functionName, `${path}/${key}`, flags)
}

function renderStatement(
  ctx: RenderContext,
  stmt: Stmt,
  functionName: string,
  path: string,
  baseFlags: Set<string>,
): Fragment {
  const flags = new Set(baseFlags)
  const fields: Fields = {}
  const condition = (source: string): string => {
    const expr = parse(source)
    return expr ? renderExpression(ctx, expr) : source
  }

  switch (stmt.kind) {
    case 'declare':
      fields.names = stmt.names.map((name) => variableName(ctx, name)).join(', ')
      fields.name = stmt.names[0] ? variableName(ctx, stmt.names[0]) : ''
      fields.type = mappedType(ctx, stmt.type)
      fields.size = stmt.size
      fields.arraySuffix = stmt.isArray ? `[${stmt.size}]` : ''
      fields.zero = zeroLiteral(ctx, stmt.type)
      if (stmt.isArray) flags.add('array')
      break
    case 'assign':
      fields.target = renderLValue(ctx, stmt.target)
      fields.expression = condition(stmt.expression)
      fields.value = fields.expression
      break
    case 'input':
      fields.variable = renderLValue(ctx, stmt.variable)
      break
    case 'output':
      fields.expression = condition(stmt.expression)
      flags.add(stmt.newline ? 'newline' : 'nonewline')
      break
    case 'if':
      fields.condition = condition(stmt.condition)
      fields.then = nested(ctx, stmt.then, functionName, path, 'then', baseFlags)
      fields.else = nested(ctx, stmt.else, functionName, path, 'else', baseFlags)
      if (stmt.else.length > 0) flags.add('else')
      break
    case 'while':
      fields.condition = condition(stmt.condition)
      fields.body = nested(ctx, stmt.body, functionName, path, 'body', baseFlags)
      break
    case 'do':
      fields.condition = condition(stmt.condition)
      fields.body = nested(ctx, stmt.body, functionName, path, 'body', baseFlags)
      break
    case 'for':
      fields.variable = variableName(ctx, stmt.variable)
      fields.start = condition(stmt.start)
      fields.end = condition(stmt.end)
      fields.step = condition(stmt.step)
      fields.direction = stmt.direction
      fields.body = nested(ctx, stmt.body, functionName, path, 'body', baseFlags)
      if (stmt.step === '1') flags.add('step')
      if (stmt.direction === 'dec') flags.add('dec')
      break
    case 'call':
      fields.function = stmt.functionName
      fields.name = stmt.functionName
      fields.args = stmt.args.map(condition).join(', ')
      break
    case 'comment':
      fields.text = stmt.text
      break
    case 'breakpoint':
      fields.condition = stmt.condition ? condition(stmt.condition) : ''
      break
    case 'turtle':
    case 'file':
      fields.op = stmt.op
      for (const [key, value] of Object.entries(stmt.fields)) fields[key] = value
      break
    case 'unsupported':
      fields.label = stmt.label
      fields.rawXml = stmt.rawXml
      break
  }

  const section = stmt.kind.charAt(0).toUpperCase() + stmt.kind.slice(1)
  return renderSection(ctx, section, fields, flags, stmtPathId(functionName, path))
}

function zeroLiteral(ctx: RenderContext, type: ScalarType | 'None'): string {
  if (type === 'String') return ctx.literalString.replace(/\{value\}/g, '')
  if (type === 'Boolean') return ctx.literalFalse
  return '0'
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_')
  return cleaned && /^[A-Za-z_]/.test(cleaned) ? cleaned : 'Main'
}

function renderParam(ctx: RenderContext, fn: FunctionDef, index: number): string {
  const param = fn.params[index]
  if (!param) return ''
  const arraySuffix = param.isArray ? '[]' : ''
  const fields: Fields = {
    name: variableName(ctx, param.name),
    type: mappedType(ctx, param.type),
    arraySuffix,
  }
  const fragment = renderSection(ctx, 'Param', fields, new Set())
  if (fragment.lines.length > 0) return fragment.lines.join(' ')
  return `${mappedType(ctx, param.type)} ${param.name}${arraySuffix}`
}

function renderFunction(
  ctx: RenderContext,
  fn: FunctionDef,
  flags: Set<string>,
): Fragment {
  if (!ctx.template.sections.Function) return EMPTY
  const params = fn.params.map((_, index) => renderParam(ctx, fn, index)).join(', ')
  const fnFlags = new Set(flags)
  if (fn.returnType !== 'None') fnFlags.add('returns')
  const body = renderBody(ctx, fn.body, fn.name, '', flags)
  const fields: Fields = {
    name: fn.name,
    params,
    body,
    returnType: mappedType(ctx, fn.returnType),
    returnName: fn.returnVariable ? variableName(ctx, fn.returnVariable) : '',
  }
  return renderSection(ctx, 'Function', fields, fnFlags)
}

export function generate(
  program: Program,
  template: Template,
): { code: string; lineMap: Record<string, number[]> } {
  const ctx = context(template)
  const flags = new Set<string>()
  const active = sectionValue(template.sections, 'Flags', 'active')
  if (active) {
    for (const flag of active.split(',')) {
      const trimmed = flag.trim()
      if (trimmed) flags.add(trimmed)
    }
  }

  const main = program.functions.find((fn) => fn.name.toLowerCase() === 'main')
  const mainBody = main
    ? renderBody(ctx, main.body, main.name, '', flags)
    : { lines: [], map: {} }
  const mainFields: Fields = {
    body: mainBody,
    name: main?.name ?? 'Main',
    params: main?.params.map((_, index) => renderParam(ctx, main, index)).join(', ') ?? '',
  }
  const mainFragment = renderSection(ctx, 'Main', mainFields, flags)

  const functions: Fragment = { lines: [], map: {} }
  for (const fn of program.functions) {
    if (fn.name.toLowerCase() === 'main') continue
    const rendered = renderFunction(ctx, fn, flags)
    if (rendered.lines.length === 0) continue
    if (functions.lines.length > 0) functions.lines.push('')
    appendFragment(functions, rendered)
  }

  const programFields: Fields = {
    main: mainFragment,
    functions,
    name: sanitizeName(program.meta.name || 'Main'),
  }
  const output = renderSection(ctx, 'Program', programFields, flags)

  return {
    code: output.lines.length > 0 ? `${output.lines.join('\n')}\n` : '',
    lineMap: output.map,
  }
}
