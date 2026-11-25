import { useMemo } from 'react'
import { getFunction } from '../../../core/model/program'
import { walkStmts } from '../../../core/model/walk'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'

export function useSymbols(): string[] {
  const program = useProjectStore((state) => state.program)
  const selectedFunction = useUiStore((state) => state.selectedFunction)

  return useMemo(() => {
    if (!program) return [] as string[]
    const names = new Set<string>()
    const fn = getFunction(program, selectedFunction)
    for (const param of fn?.params ?? []) names.add(param.name)
    if (fn) {
      walkStmts(fn.body, '', (stmt) => {
        if (stmt.kind === 'declare') stmt.names.forEach((name) => names.add(name))
        if (stmt.kind === 'for') names.add(stmt.variable)
      })
    }
    for (const item of program.functions) names.add(item.name)
    return Array.from(names)
  }, [program, selectedFunction])
}
