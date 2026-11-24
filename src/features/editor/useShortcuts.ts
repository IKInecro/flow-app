import { useEffect } from 'react'
import { removeStmt } from '../../core/model/program'
import { downloadFprg } from './export/files'
import { useProjectStore } from './store/projectStore'
import { useUiStore } from './store/uiStore'
import { useRuntimeStore } from '../run/runtimeStore'

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    Boolean(target.isContentEditable)
  )
}

export function useShortcuts(): void {
  const program = useProjectStore((state) => state.program)
  const commit = useProjectStore((state) => state.commit)
  const undo = useProjectStore((state) => state.undo)
  const redo = useProjectStore((state) => state.redo)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const selectedPath = useUiStore((state) => state.selectedPath)
  const select = useUiStore((state) => state.select)
  const setCommandOpen = useUiStore((state) => state.setCommandOpen)
  const commandOpen = useUiStore((state) => state.commandOpen)
  const startRun = useRuntimeStore((state) => state.startRun)
  const stepRun = useRuntimeStore((state) => state.stepRun)
  const stopRun = useRuntimeStore((state) => state.stopRun)

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (isEditableTarget(event.target)) return
      const modifier = event.ctrlKey || event.metaKey
      const key = event.key

      if (modifier && key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(!commandOpen)
        return
      }
      if (key === 'F5') {
        event.preventDefault()
        if (program) void startRun(program)
        return
      }
      if (key === 'F10') {
        event.preventDefault()
        if (program) void stepRun(program)
        return
      }
      if (modifier && key.toLowerCase() === 's') {
        event.preventDefault()
        if (program) downloadFprg(program)
        return
      }
      if (modifier && key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (modifier && key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if ((key === 'Delete' || key === 'Backspace') && selectedPath && program) {
        event.preventDefault()
        commit((current) => removeStmt(current, selectedFunction, selectedPath))
        select(null)
        return
      }
      if (key === 'Escape') {
        if (commandOpen) setCommandOpen(false)
        else if (selectedPath) select(null)
        else stopRun()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    commandOpen,
    commit,
    program,
    redo,
    select,
    selectedFunction,
    selectedPath,
    setCommandOpen,
    startRun,
    stepRun,
    stopRun,
    undo,
  ])
}
