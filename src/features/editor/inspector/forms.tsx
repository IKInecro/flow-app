import { useEffect, useId, useState, type ReactNode } from 'react'
import type { LValue, ScalarType, Stmt } from '../../../core/model/types'
import { useProjectStore } from '../store/projectStore'

function useDraft(value: string): [string, (next: string) => void, () => void] {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return [draft, setDraft, () => setDraft(value)]
}

interface TextFieldProps {
  label: string
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  list?: string
  multiline?: boolean
}

export function TextField({ label, value, onCommit, placeholder, list, multiline }: TextFieldProps) {
  const id = useId()
  const [draft, setDraft] = useDraft(value)
  const commit = () => {
    if (draft !== value) onCommit(draft)
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={draft}
          placeholder={placeholder}
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          list={list}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      )}
    </div>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onCommit: (value: T) => void
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onCommit,
}: SelectFieldProps<T>) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onCommit(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CheckboxField({
  label,
  checked,
  onCommit,
}: {
  label: string
  checked: boolean
  onCommit: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="field field--inline">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCommit(event.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}

const SCALAR_TYPES: readonly { value: ScalarType; label: string }[] = [
  { value: 'Integer', label: 'Integer' },
  { value: 'Real', label: 'Real' },
  { value: 'String', label: 'String' },
  { value: 'Boolean', label: 'Boolean' },
]

function update(target: LValue, changes: Partial<LValue>): LValue {
  return { ...target, ...changes }
}

interface StmtFormProps {
  stmt: Stmt
  onCommit: (stmt: Stmt) => void
}

export function StmtForm({ stmt, onCommit }: StmtFormProps): ReactNode {
  switch (stmt.kind) {
    case 'output':
      return (
        <>
          <TextField
            label="Ekspresi"
            value={stmt.expression}
            list="mf-symbols"
            onCommit={(expression) => onCommit({ ...stmt, expression })}
          />
          <CheckboxField
            label="Baris baru"
            checked={stmt.newline}
            onCommit={(newline) => onCommit({ ...stmt, newline })}
          />
        </>
      )
    case 'assign':
      return <AssignForm stmt={stmt} onCommit={onCommit} />
    case 'input':
      return (
        <>
          <TextField
            label="Variabel"
            value={stmt.variable.name}
            onCommit={(name) => onCommit({ ...stmt, variable: update(stmt.variable, { name }) })}
          />
          <TextField
            label="Index (opsional)"
            value={stmt.variable.index ?? ''}
            onCommit={(index) =>
              onCommit({
                ...stmt,
                variable: update(stmt.variable, { index: index.trim() || undefined }),
              })
            }
          />
        </>
      )
    case 'declare':
      return (
        <>
          <TextField
            label="Nama variabel"
            value={stmt.names.join(', ')}
            onCommit={(raw) =>
              onCommit({
                ...stmt,
                names: raw
                  .split(',')
                  .map((name) => name.trim())
                  .filter(Boolean),
              })
            }
          />
          <SelectField
            label="Tipe"
            value={(stmt.type === 'None' ? 'Integer' : stmt.type) as ScalarType}
            options={SCALAR_TYPES}
            onCommit={(type) => onCommit({ ...stmt, type })}
          />
          <CheckboxField
            label="Array"
            checked={stmt.isArray}
            onCommit={(isArray) => onCommit({ ...stmt, isArray })}
          />
          {stmt.isArray ? (
            <TextField
              label="Ukuran"
              value={stmt.size}
              placeholder="mis. 10"
              onCommit={(size) => onCommit({ ...stmt, size })}
            />
          ) : null}
        </>
      )
    case 'if':
    case 'while':
    case 'do':
      return (
        <TextField
          label="Kondisi"
          value={stmt.condition}
          list="mf-symbols"
          onCommit={(condition) => onCommit({ ...stmt, condition })}
        />
      )
    case 'for':
      return (
        <>
          <TextField
            label="Variabel"
            value={stmt.variable}
            onCommit={(variable) => onCommit({ ...stmt, variable })}
          />
          <TextField
            label="Mulai"
            value={stmt.start}
            onCommit={(start) => onCommit({ ...stmt, start })}
          />
          <TextField label="Selesai" value={stmt.end} onCommit={(end) => onCommit({ ...stmt, end })} />
          <TextField
            label="Langkah"
            value={stmt.step}
            onCommit={(step) => onCommit({ ...stmt, step })}
          />
          <SelectField
            label="Arah"
            value={stmt.direction}
            options={[
              { value: 'inc', label: 'Naik' },
              { value: 'dec', label: 'Turun' },
            ]}
            onCommit={(direction) => onCommit({ ...stmt, direction })}
          />
        </>
      )
    case 'call':
      return <CallForm stmt={stmt} onCommit={onCommit} />
    case 'comment':
      return (
        <TextField
          label="Catatan"
          value={stmt.text}
          multiline
          onCommit={(text) => onCommit({ ...stmt, text })}
        />
      )
    case 'breakpoint':
      return (
        <TextField
          label="Kondisi (opsional)"
          value={stmt.condition ?? ''}
          list="mf-symbols"
          onCommit={(raw) => onCommit({ ...stmt, condition: raw.trim() || undefined })}
        />
      )
    case 'turtle':
    case 'file':
      return (
        <div className="notice" role="note">
          <strong>Fitur tahap 2</strong>
          <p>
            Node {stmt.kind === 'turtle' ? 'turtle grafis' : 'file I/O'} ini dipertahankan saat
            import tapi belum bisa dijalankan atau diedit. Rencana phase 2.
          </p>
          <dl className="notice__fields">
            <dt>Operasi</dt>
            <dd>{stmt.op}</dd>
            {Object.entries(stmt.fields).map(([key, value]) => (
              <span key={key} className="notice__pair">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </span>
            ))}
          </dl>
        </div>
      )
    case 'unsupported':
      return (
        <div className="notice" role="note">
          <strong>Node tidak dikenal</strong>
          <pre>{stmt.rawXml}</pre>
        </div>
      )
  }
}

function AssignForm({
  stmt,
  onCommit,
}: {
  stmt: Extract<Stmt, { kind: 'assign' }>
  onCommit: (stmt: Stmt) => void
}) {
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <TextField
        label="Nama target"
        value={stmt.target.name}
        onCommit={(name) => {
          if (!name.trim()) {
            setError('Nama variabel wajib diisi.')
            return
          }
          setError(null)
          onCommit({ ...stmt, target: update(stmt.target, { name }) })
        }}
      />
      <TextField
        label="Index target (opsional)"
        value={stmt.target.index ?? ''}
        onCommit={(index) =>
          onCommit({
            ...stmt,
            target: update(stmt.target, { index: index.trim() || undefined }),
          })
        }
      />
      <TextField
        label="Ekspresi"
        value={stmt.expression}
        list="mf-symbols"
        onCommit={(expression) => onCommit({ ...stmt, expression })}
      />
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}

function CallForm({
  stmt,
  onCommit,
}: {
  stmt: Extract<Stmt, { kind: 'call' }>
  onCommit: (stmt: Stmt) => void
}) {
  const program = useProjectStoreProgram()
  const target = program?.functions.find(
    (fn) => fn.name.toLowerCase() === stmt.functionName.toLowerCase(),
  )
  const arity = target?.params.length
  const fields = Math.max(stmt.args.length, arity ?? 0)

  function setArg(index: number, value: string) {
    const args = Array.from({ length: fields }, (_, position) => stmt.args[position] ?? '')
    args[index] = value
    onCommit({ ...stmt, args })
  }

  return (
    <>
      <SelectField
        label="Function"
        value={stmt.functionName}
        options={(program?.functions ?? []).map((fn) => ({ value: fn.name, label: fn.name }))}
        onCommit={(functionName) => onCommit({ ...stmt, functionName })}
      />
      {arity !== undefined && arity !== stmt.args.length ? (
        <p className="field__warning" role="status">
          Butuh {arity} argumen, dapat {stmt.args.length}.
        </p>
      ) : null}
      {Array.from({ length: fields }, (_, index) => (
        <TextField
          key={index}
          label={`Argumen ${index + 1}`}
          value={stmt.args[index] ?? ''}
          list="mf-symbols"
          onCommit={(value) => setArg(index, value)}
        />
      ))}
    </>
  )
}

function useProjectStoreProgram() {
  return useProjectStore((state) => state.program)
}
