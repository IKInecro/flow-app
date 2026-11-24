import type {
  FlowType,
  FunctionDef,
  LValue,
  Param,
  Program,
  ProgramMeta,
  ScalarType,
  Stmt,
} from '../model/types'

export type ParseResult =
  | { ok: true; program: Program; warnings: string[] }
  | { ok: false; error: string }

const FLOW_TYPES: FlowType[] = ['None', 'Integer', 'Real', 'String', 'Boolean']
const TURTLE_TAGS = new Set(['forward', 'turn', 'pen', 'home', 'clear'])
const FILE_TAGS = new Set(['open', 'close', 'read', 'write'])

function child(el: Element, tag: string): Element | null {
  return Array.from(el.children).find((candidate) => candidate.tagName === tag) ?? null
}

function children(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter((candidate) => candidate.tagName === tag)
}

function attr(el: Element, name: string, fallback = ''): string {
  return el.getAttribute(name) ?? fallback
}

function flowType(value: string, fallback: ScalarType = 'Integer'): FlowType {
  return FLOW_TYPES.includes(value as FlowType) ? (value as FlowType) : fallback
}

function lvalue(raw: string): LValue {
  const match = /^([A-Za-z][A-Za-z0-9]*)\s*(?:\[(.*)\])?$/.exec(raw.trim())
  if (!match) return { name: raw.trim() }
  return match[2] === undefined ? { name: match[1] } : { name: match[1], index: match[2] }
}

function splitArgs(source: string): string[] {
  const args: string[] = []
  let depth = 0
  let quote = false
  let start = 0
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (char === '"' && source[i - 1] !== '\\') quote = !quote
    if (quote) continue
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (char === ',' && depth === 0) {
      args.push(source.slice(start, i).trim())
      start = i + 1
    }
  }
  const tail = source.slice(start).trim()
  if (tail) args.push(tail)
  return args
}

function parseCall(raw: string): Pick<Extract<Stmt, { kind: 'call' }>, 'functionName' | 'args'> {
  const open = raw.indexOf('(')
  if (open === -1) return { functionName: raw.trim(), args: [] }
  const close = raw.lastIndexOf(')')
  return {
    functionName: raw.slice(0, open).trim(),
    args: splitArgs(raw.slice(open + 1, close === -1 ? undefined : close)),
  }
}

function parseBody(el: Element | null): Stmt[] {
  if (!el) return []
  return Array.from(el.children).map(parseStmt)
}

function parseLoopBody(el: Element): Stmt[] {
  const body = child(el, 'body')
  if (body) return parseBody(body)
  return Array.from(el.children)
    .filter((candidate) => candidate.tagName !== 'body')
    .map(parseStmt)
}

function parseStmt(el: Element): Stmt {
  const tag = el.tagName
  switch (tag) {
    case 'declare': {
      const raw = attr(el, 'name') || attr(el, 'variables')
      return {
        kind: 'declare',
        names: raw
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean),
        type: flowType(attr(el, 'type')),
        isArray: attr(el, 'array') === 'True',
        size: attr(el, 'size'),
      }
    }
    case 'assign':
      return {
        kind: 'assign',
        target: lvalue(attr(el, 'variable')),
        expression: attr(el, 'expression'),
      }
    case 'input':
      return { kind: 'input', variable: lvalue(attr(el, 'variable')) }
    case 'output':
      return {
        kind: 'output',
        expression: attr(el, 'expression'),
        newline: attr(el, 'newline', 'True') !== 'False',
      }
    case 'if':
      return {
        kind: 'if',
        condition: attr(el, 'expression'),
        then: parseBody(child(el, 'then')),
        else: parseBody(child(el, 'else')),
      }
    case 'while':
      return {
        kind: 'while',
        condition: attr(el, 'expression'),
        body: parseLoopBody(el),
      }
    case 'do':
      return {
        kind: 'do',
        condition: attr(el, 'expression'),
        body: parseLoopBody(el),
      }
    case 'for':
      return {
        kind: 'for',
        variable: attr(el, 'variable', 'i'),
        start: attr(el, 'start', '0'),
        end: attr(el, 'end', '0'),
        step: attr(el, 'step', '1'),
        direction: attr(el, 'direction') === 'dec' ? 'dec' : 'inc',
        body: parseLoopBody(el),
      }
    case 'call': {
      const { functionName, args } = parseCall(attr(el, 'expression'))
      return { kind: 'call', functionName, args }
    }
    case 'comment':
      return { kind: 'comment', text: attr(el, 'text') }
    case 'breakpoint': {
      const condition = attr(el, 'expression') || attr(el, 'condition')
      return condition ? { kind: 'breakpoint', condition } : { kind: 'breakpoint' }
    }
    default: {
      if (TURTLE_TAGS.has(tag)) {
        return { kind: 'turtle', op: tag, fields: attributesOf(el) }
      }
      if (FILE_TAGS.has(tag)) {
        return { kind: 'file', op: tag, fields: attributesOf(el) }
      }
      return {
        kind: 'unsupported',
        label: tag,
        rawXml: new XMLSerializer().serializeToString(el),
      }
    }
  }
}

function attributesOf(el: Element): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const attribute of Array.from(el.attributes)) fields[attribute.name] = attribute.value
  return fields
}

function parseMeta(root: Element): ProgramMeta {
  const meta: ProgramMeta = { name: '', authors: '', about: '' }
  const attrs = child(root, 'attributes')
  if (!attrs) return meta
  for (const item of children(attrs, 'attribute')) {
    const name = attr(item, 'name')
    const value = attr(item, 'value')
    if (name === 'edited') {
      meta.edited = [...(meta.edited ?? []), value]
    } else if (name === 'name' || name === 'authors' || name === 'about') {
      meta[name] = value
    } else if (name === 'saved' || name === 'created') {
      meta[name] = value
    }
  }
  return meta
}

function parseFunction(el: Element): FunctionDef {
  const paramsEl = child(el, 'parameters')
  const params: Param[] = paramsEl
    ? children(paramsEl, 'parameter').map((param) => ({
        name: attr(param, 'name'),
        type: flowType(attr(param, 'type')) as ScalarType,
        isArray: attr(param, 'array') === 'True',
      }))
    : []

  return {
    name: attr(el, 'name', 'Main'),
    returnType: flowType(attr(el, 'type')),
    returnVariable: attr(el, 'variable'),
    params,
    body: parseBody(child(el, 'body')),
  }
}

export function parseFprg(xml: string): ParseResult {
  if (!xml.trim()) return { ok: false, error: 'File kosong.' }
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml')
  } catch {
    return { ok: false, error: 'XML tidak valid.' }
  }
  const parserError = doc.getElementsByTagName('parsererror')[0]
  if (parserError) {
    return { ok: false, error: `XML tidak valid: ${parserError.textContent?.trim() ?? 'unknown error'}` }
  }
  const root = doc.documentElement
  if (!root || root.tagName !== 'flowgorithm') {
    return { ok: false, error: 'Bukan file Flowgorithm (.fprg).' }
  }

  const functions = children(root, 'function').map(parseFunction)
  if (functions.length === 0) {
    return { ok: false, error: 'File tidak memiliki function.' }
  }
  if (!functions.some((fn) => fn.name.toLowerCase() === 'main')) {
    return { ok: false, error: 'Function Main tidak ditemukan.' }
  }

  const unknown = Array.from(root.children)
    .filter((el) => el.tagName !== 'attributes' && el.tagName !== 'function')
    .map((el) => new XMLSerializer().serializeToString(el))

  const program: Program = {
    fileVersion: attr(root, 'fileversion', '1.0'),
    meta: parseMeta(root),
    functions,
    ...(unknown.length ? { unknown } : {}),
  }

  return { ok: true, program, warnings: [] }
}
