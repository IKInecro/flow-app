import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  Braces,
  CircleDot,
  CornerUpRight,
  Equal,
  FileText,
  Flag,
  GitBranch,
  ListOrdered,
  PenLine,
  Play,
  RefreshCw,
  Repeat,
  StickyNote,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

export const KIND_META: Record<string, { label: string; icon: LucideIcon }> = {
  start: { label: 'Start', icon: Play },
  end: { label: 'End', icon: Flag },
  declare: { label: 'Declare', icon: Braces },
  assign: { label: 'Set value', icon: Equal },
  input: { label: 'Read input', icon: ArrowDownToLine },
  output: { label: 'Display', icon: ArrowUpFromLine },
  if: { label: 'Condition', icon: GitBranch },
  while: { label: 'Loop', icon: Repeat },
  do: { label: 'Loop', icon: RefreshCw },
  for: { label: 'Loop', icon: ListOrdered },
  call: { label: 'Function call', icon: CornerUpRight },
  comment: { label: 'Note', icon: StickyNote },
  breakpoint: { label: 'Pause', icon: CircleDot },
  turtle: { label: 'Turtle', icon: PenLine },
  file: { label: 'File', icon: FileText },
  unsupported: { label: 'Unsupported', icon: TriangleAlert },
}

export function kindMeta(kind: string): { label: string; icon: LucideIcon } {
  return KIND_META[kind] ?? { label: 'Block', icon: Box }
}
