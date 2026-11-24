import type { FlowType, ScalarType } from '../model/types'
import type { Value } from '../lang/values'

export interface VariableSnapshot {
  name: string
  type: FlowType
  value: string
  arrayItems?: { index: number; value: string }[]
}

export interface FrameSnapshot {
  functionName: string
  variables: VariableSnapshot[]
}

export interface RuntimeError {
  message: string
  path: string
  function: string
  callStack: string[]
}

export type RuntimeEvent =
  | { type: 'start'; function: string }
  | { type: 'nodeEnter'; path: string; function: string }
  | { type: 'nodeExit'; path: string }
  | { type: 'output'; text: string; newline: boolean; path: string }
  | { type: 'inputRequest'; variable: string; expectedType: ScalarType }
  | { type: 'inputAccept'; value: string }
  | { type: 'inputError'; message: string; path: string }
  | { type: 'breakpoint'; path: string }
  | { type: 'callEnter'; function: string; args: Value[]; path: string }
  | { type: 'callExit'; function: string; returnValue?: Value }
  | { type: 'snapshot'; frames: FrameSnapshot[] }
  | { type: 'error'; error: RuntimeError }
  | { type: 'done' }
