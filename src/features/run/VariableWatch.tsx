import { useRuntimeStore } from './runtimeStore'

export function VariableWatch() {
  const variables = useRuntimeStore((state) => state.variables)
  const status = useRuntimeStore((state) => state.status)

  return (
    <aside className="watch" aria-label="Runtime variables">
      <h2 className="inspector__title">Variables</h2>
      {variables.length === 0 ? (
        <p className="inspector__hint">
          {status === 'idle'
            ? 'Run the program to see variable values.'
            : 'No variables in this scope yet.'}
        </p>
      ) : (
        <table className="watch__table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((variable) => (
              <tr key={`${variable.functionName}:${variable.name}`}>
                <th scope="row">
                  <span className="watch__name">{variable.name}</span>
                  <span className="watch__scope">{variable.functionName}</span>
                </th>
                <td>{variable.type}</td>
                <td>
                  {variable.arrayItems ? (
                    <span className="watch__array" title={variable.arrayItems.map((item) => item.value).join(', ')}>
                      [{variable.arrayItems.length}]
                    </span>
                  ) : (
                    <code>{variable.value}</code>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  )
}
