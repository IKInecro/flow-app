import { useRuntimeStore } from './runtimeStore'

export function CallStack() {
  const callStack = useRuntimeStore((state) => state.callStack)

  return (
    <aside className="watch" aria-label="Call stack">
      <h2 className="inspector__title">Call stack</h2>
      {callStack.length === 0 ? (
        <p className="inspector__hint">Belum ada frame aktif.</p>
      ) : (
        <ol className="callstack">
          {callStack
            .slice()
            .reverse()
            .map((frame, index) => (
              <li key={`${frame.functionName}:${index}`} className={index === 0 ? 'is-current' : ''}>
                <span>{frame.functionName}</span>
                {frame.path ? <code>{frame.path}</code> : null}
              </li>
            ))}
        </ol>
      )}
    </aside>
  )
}
