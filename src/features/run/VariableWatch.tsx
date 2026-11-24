import { useRuntimeStore } from './runtimeStore'

export function VariableWatch() {
  const variables = useRuntimeStore((state) => state.variables)
  const status = useRuntimeStore((state) => state.status)

  return (
    <aside className="watch" aria-label="Variabel runtime">
      <h2 className="inspector__title">Variabel</h2>
      {variables.length === 0 ? (
        <p className="inspector__hint">
          {status === 'idle'
            ? 'Jalankan program untuk melihat nilai variabel.'
            : 'Belum ada variabel di scope ini.'}
        </p>
      ) : (
        <table className="watch__table">
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">Tipe</th>
              <th scope="col">Nilai</th>
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
