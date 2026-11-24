import { useMemo } from 'react'
import { checkProgram } from '../../../core/lang/validate'
import { useProjectStore } from '../store/projectStore'

export function Problems() {
  const program = useProjectStore((state) => state.program)
  const diagnostics = useMemo(() => (program ? checkProgram(program) : []), [program])

  if (diagnostics.length === 0) return null

  return (
    <section className="problems" aria-label="Masalah">
      <h3 className="problems__title">Masalah ({diagnostics.length})</h3>
      <ul className="problems__list">
        {diagnostics.map((item, index) => (
          <li
            key={`${item.function}:${item.path}:${index}`}
            className={`problems__item problems__item--${item.severity}`}
          >
            <span className="problems__where">
              {item.function}
              {item.path ? ` · ${item.path}` : ''}
            </span>
            <span>{item.message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
