import type { ScalarType } from '../model/types'

export interface ScalarValue {
  kind: 'scalar'
  type: ScalarType
  value: number | string | boolean
}

export interface ArrayValue {
  kind: 'array'
  elementType: ScalarType
  items: ScalarValue[]
}

export type Value = ScalarValue | ArrayValue

export interface EvalContext {
  lookup(name: string): Value | undefined
  callFunction(name: string, args: Value[]): Value
  random(max: number): number
}

export class RuntimeFault extends Error {
  path?: string

  constructor(message: string, path?: string) {
    super(message)
    this.name = 'RuntimeFault'
    this.path = path
  }
}

export function scalar(type: ScalarType, value: number | string | boolean): ScalarValue {
  return { kind: 'scalar', type, value }
}

export function toStr(value: ScalarValue): string {
  if (value.type === 'Boolean') return value.value ? 'true' : 'false'
  if (value.type === 'Real') {
    const number = Number(value.value)
    return Number.isFinite(number) ? String(number) : String(value.value)
  }
  return String(value.value)
}

export function asScalar(value: Value): ScalarValue {
  if (value.kind === 'array') throw new RuntimeFault('Array requires an index.')
  return value
}

export function asNumber(value: ScalarValue): number {
  if (value.type !== 'Integer' && value.type !== 'Real') {
    throw new RuntimeFault(`Value ${value.type} is not a number.`)
  }
  return Number(value.value)
}

export function asInteger(value: ScalarValue): number {
  const number = asNumber(value)
  return Math.trunc(number)
}

export function asBoolean(value: ScalarValue): boolean {
  if (value.type !== 'Boolean') throw new RuntimeFault(`Value ${value.type} is not Boolean.`)
  return Boolean(value.value)
}

export function asString(value: ScalarValue): string {
  if (value.type !== 'String') throw new RuntimeFault(`Value ${value.type} is not a String.`)
  return String(value.value)
}

export function coerce(value: ScalarValue, type: ScalarType): ScalarValue {
  if (value.type === type) return value
  if (type === 'String') return scalar('String', toStr(value))
  if (type === 'Integer') {
    if (typeof value.value === 'boolean') return scalar('Integer', value.value ? 1 : 0)
    return scalar('Integer', Math.trunc(Number(value.value)))
  }
  if (type === 'Real') {
    if (typeof value.value === 'boolean') return scalar('Real', value.value ? 1 : 0)
    return scalar('Real', Number(value.value))
  }
  if (type === 'Boolean') {
    if (typeof value.value === 'boolean') return value
    if (typeof value.value === 'number') return scalar('Boolean', value.value !== 0)
    return scalar('Boolean', String(value.value).trim().toLowerCase() === 'true')
  }
  return value
}

export function convertInput(text: string, type: ScalarType): ScalarValue {
  const trimmed = text.trim()
  if (type === 'Integer') {
    const number = Number(trimmed)
    if (trimmed === '' || !Number.isFinite(number)) {
      throw new RuntimeFault(`"${text}" is not a valid Integer.`)
    }
    return scalar('Integer', Math.trunc(number))
  }
  if (type === 'Real') {
    const number = Number(trimmed)
    if (trimmed === '' || !Number.isFinite(number)) {
      throw new RuntimeFault(`"${text}" is not a valid Real.`)
    }
    return scalar('Real', number)
  }
  if (type === 'Boolean') {
    const lower = trimmed.toLowerCase()
    if (lower === 'true' || lower === 'ya' || lower === '1') return scalar('Boolean', true)
    if (lower === 'false' || lower === 'tidak' || lower === '0') return scalar('Boolean', false)
    throw new RuntimeFault(`"${text}" is not a valid Boolean.`)
  }
  return scalar('String', text)
}
