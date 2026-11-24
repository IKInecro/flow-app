import type { StmtKind } from '../model/types'

export const NODE_SIZE: Record<StmtKind, { width: number; height: number }> = {
  declare: { width: 220, height: 58 },
  assign: { width: 220, height: 58 },
  input: { width: 210, height: 56 },
  output: { width: 210, height: 56 },
  if: { width: 210, height: 74 },
  while: { width: 210, height: 74 },
  do: { width: 210, height: 74 },
  for: { width: 210, height: 74 },
  call: { width: 220, height: 58 },
  comment: { width: 230, height: 76 },
  breakpoint: { width: 150, height: 48 },
  turtle: { width: 210, height: 56 },
  file: { width: 210, height: 56 },
  unsupported: { width: 210, height: 58 },
}

export const TERMINATOR_SIZE = { width: 160, height: 44 }
export const MERGE_SIZE = { width: 2, height: 2 }
