import {
  RuntimeFault,
  asInteger,
  asNumber,
  asScalar,
  asString,
  scalar,
  toStr,
  type EvalContext,
  type ScalarValue,
  type Value,
} from './values'
import type { ScalarType } from '../model/types'

export const BUILTIN_ARITY: Record<string, number> = {
  abs: 1,
  arcsin: 1,
  arccos: 1,
  arctan: 1,
  cos: 1,
  int: 1,
  ln: 1,
  log: 1,
  log10: 1,
  sgn: 1,
  sin: 1,
  sqrt: 1,
  tan: 1,
  len: 1,
  char: 2,
  tochar: 1,
  tocode: 1,
  tofixed: 2,
  tointeger: 1,
  toreal: 1,
  tostring: 1,
  eof: 0,
  random: 1,
  size: 1,
}

const BUILTIN_RETURNS: Record<string, ScalarType> = {
  abs: 'Real',
  arcsin: 'Real',
  arccos: 'Real',
  arctan: 'Real',
  cos: 'Real',
  int: 'Integer',
  ln: 'Real',
  log: 'Real',
  log10: 'Real',
  sgn: 'Integer',
  sin: 'Real',
  sqrt: 'Real',
  tan: 'Real',
  len: 'Integer',
  char: 'String',
  tochar: 'String',
  tocode: 'Integer',
  tofixed: 'String',
  tointeger: 'Integer',
  toreal: 'Real',
  tostring: 'String',
  eof: 'Boolean',
  random: 'Integer',
  size: 'Integer',
}

export function isBuiltin(name: string): boolean {
  return name.toLowerCase() in BUILTIN_ARITY
}

export function builtinReturnType(name: string): ScalarType | undefined {
  return BUILTIN_RETURNS[name.toLowerCase()]
}

function expectArity(name: string, args: Value[]): void {
  const expected = BUILTIN_ARITY[name.toLowerCase()]
  if (expected !== undefined && args.length !== expected) {
    throw new RuntimeFault(`${name} butuh ${expected} argumen, dapat ${args.length}.`)
  }
}

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RuntimeFault(`${name} tidak terdefinisi untuk nilai itu.`)
  return value
}

export function callBuiltin(name: string, args: Value[], ctx: EvalContext): ScalarValue {
  const key = name.toLowerCase()
  expectArity(name, args)

  const num = (index: number): number => asNumber(asScalar(args[index]))
  const int = (index: number): number => asInteger(asScalar(args[index]))
  const str = (index: number): string => asString(asScalar(args[index]))
  const value = (index: number): ScalarValue => asScalar(args[index])

  switch (key) {
    case 'abs': {
      const arg = value(0)
      return scalar(arg.type === 'Integer' ? 'Integer' : 'Real', Math.abs(asNumber(arg)))
    }
    case 'arcsin':
      return scalar('Real', finite(Math.asin(num(0)), 'Arcsin'))
    case 'arccos':
      return scalar('Real', finite(Math.acos(num(0)), 'Arccos'))
    case 'arctan':
      return scalar('Real', finite(Math.atan(num(0)), 'Arctan'))
    case 'cos':
      return scalar('Real', Math.cos(num(0)))
    case 'sin':
      return scalar('Real', Math.sin(num(0)))
    case 'tan':
      return scalar('Real', Math.tan(num(0)))
    case 'int':
      return scalar('Integer', Math.trunc(num(0)))
    case 'ln':
    case 'log': {
      const input = num(0)
      if (input <= 0) throw new RuntimeFault('Logaritma butuh nilai > 0.')
      return scalar('Real', Math.log(input))
    }
    case 'log10': {
      const input = num(0)
      if (input <= 0) throw new RuntimeFault('Logaritma butuh nilai > 0.')
      return scalar('Real', Math.log10(input))
    }
    case 'sqrt': {
      const input = num(0)
      if (input < 0) throw new RuntimeFault('Sqrt butuh nilai >= 0.')
      return scalar('Real', Math.sqrt(input))
    }
    case 'sgn':
      return scalar('Integer', Math.sign(num(0)))
    case 'len':
      return scalar('Integer', Array.from(str(0)).length)
    case 'char': {
      const chars = Array.from(str(0))
      const index = int(1)
      if (index < 0 || index >= chars.length) throw new RuntimeFault('Index Char di luar batas.')
      return scalar('String', chars[index])
    }
    case 'tochar': {
      const code = int(0)
      if (code < 0 || code > 0x10ffff) throw new RuntimeFault('Kode karakter di luar batas.')
      return scalar('String', String.fromCodePoint(code))
    }
    case 'tocode': {
      const chars = Array.from(str(0))
      if (chars.length === 0) throw new RuntimeFault('ToCode butuh string tidak kosong.')
      return scalar('Integer', chars[0].codePointAt(0) ?? 0)
    }
    case 'tofixed': {
      const digits = Math.min(20, Math.max(0, int(1)))
      return scalar('String', num(0).toFixed(digits))
    }
    case 'tointeger': {
      const arg = value(0)
      const parsed = Number(toStr(arg).trim())
      if (!Number.isFinite(parsed)) throw new RuntimeFault(`"${toStr(arg)}" bukan angka.`)
      return scalar('Integer', Math.trunc(parsed))
    }
    case 'toreal': {
      const arg = value(0)
      const parsed = Number(toStr(arg).trim())
      if (!Number.isFinite(parsed)) throw new RuntimeFault(`"${toStr(arg)}" bukan angka.`)
      return scalar('Real', parsed)
    }
    case 'tostring':
      return scalar('String', toStr(value(0)))
    case 'eof':
      return scalar('Boolean', false)
    case 'random': {
      const max = int(0)
      if (max <= 0) throw new RuntimeFault('Random butuh nilai > 0.')
      const result = Math.floor(ctx.random(max))
      return scalar('Integer', Math.min(max - 1, Math.max(0, result)))
    }
    case 'size': {
      const arg = args[0]
      if (!arg || arg.kind !== 'array') throw new RuntimeFault('Size butuh array.')
      return scalar('Integer', arg.items.length)
    }
    default:
      throw new RuntimeFault(`Fungsi bawaan tidak dikenal: ${name}.`)
  }
}
