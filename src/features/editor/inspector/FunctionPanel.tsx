import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FunctionDef, Program, ScalarType, Stmt } from '../../../core/model/types'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'

const TYPES: ScalarType[] = ['Integer', 'Real', 'String', 'Boolean']

function renameCalls(node: Stmt, from: string, to: string): Stmt {
  switch (node.kind) {
    case 'call':
      return node.functionName.toLowerCase() === from.toLowerCase()
        ? { ...node, functionName: to }
        : node
    case 'if':
      return {
        ...node,
        then: node.then.map((child) => renameCalls(child, from, to)),
        else: node.else.map((child) => renameCalls(child, from, to)),
      }
    case 'while':
    case 'do':
    case 'for':
      return { ...node, body: node.body.map((child) => renameCalls(child, from, to)) }
    default:
      return node
  }
}

function replaceFunction(program: Program, fn: FunctionDef): Program {
  return {
    ...program,
    functions: program.functions.map((item) => (item === fn ? fn : item)),
  }
}

export function FunctionPanel() {
  const program = useProjectStore((state) => state.program)
  const commit = useProjectStore((state) => state.commit)
  const selectedFunction = useUiStore((state) => state.selectedFunction)
  const setSelectedFunction = useUiStore((state) => state.setSelectedFunction)
  const [renameDraft, setRenameDraft] = useState(selectedFunction)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const selected = program?.functions.find(
    (fn) => fn.name.toLowerCase() === selectedFunction.toLowerCase(),
  )

  useEffect(() => {
    setRenameDraft(selected?.name ?? selectedFunction)
    setError(null)
  }, [selected, selectedFunction])

  function conflict(name: string, ignore?: string): boolean {
    return Boolean(
      program?.functions.some(
        (fn) =>
          fn.name.toLowerCase() === name.toLowerCase() &&
          fn.name.toLowerCase() !== ignore?.toLowerCase(),
      ),
    )
  }

  function rename(): void {
    if (!program || !selected) return
    const next = renameDraft.trim()
    if (!next) {
      setError('Nama function wajib diisi.')
      return
    }
    if (next === selected.name) return
    if (conflict(next, selected.name)) {
      setError('Nama function sudah ada.')
      return
    }
    const from = selected.name
    commit((current) => ({
      ...current,
      functions: current.functions.map((fn) => {
        const renamed =
          fn.name.toLowerCase() === from.toLowerCase() ? { ...fn, name: next } : fn
        return {
          ...renamed,
          body: renamed.body.map((stmt) => renameCalls(stmt, from, next)),
        }
      }),
    }))
    setSelectedFunction(next)
    setError(null)
  }

  function add(): void {
    const next = newName.trim()
    if (!next) {
      setError('Nama function wajib diisi.')
      return
    }
    if (conflict(next)) {
      setError('Nama function sudah ada.')
      return
    }
    const fn: FunctionDef = {
      name: next,
      returnType: 'None',
      returnVariable: '',
      params: [],
      body: [],
    }
    commit((current) => ({ ...current, functions: [...current.functions, fn] }))
    setNewName('')
    setError(null)
    setSelectedFunction(next)
  }

  function remove(): void {
    if (!program || !selected || selected.name.toLowerCase() === 'main') return
    commit((current) => ({
      ...current,
      functions: current.functions.filter((fn) => fn !== selected),
    }))
    setSelectedFunction('Main')
  }

  function saveFunction(fn: FunctionDef): void {
    commit((current) => replaceFunction(current, fn))
  }

  function addParam(): void {
    if (!selected) return
    const base = 'p'
    let index = selected.params.length + 1
    while (selected.params.some((param) => param.name.toLowerCase() === `${base}${index}`)) {
      index += 1
    }
    saveFunction({
      ...selected,
      params: [...selected.params, { name: `${base}${index}`, type: 'Integer', isArray: false }],
    })
  }

  function updateParam(index: number, changes: Partial<FunctionDef['params'][number]>): void {
    if (!selected) return
    const next = selected.params.map((param, position) =>
      position === index ? { ...param, ...changes } : param,
    )
    const names = next.map((param) => param.name.trim().toLowerCase())
    if (names.some((name) => !name)) {
      setError('Nama parameter wajib diisi.')
      return
    }
    if (new Set(names).size !== names.length) {
      setError('Nama parameter tidak boleh duplikat.')
      return
    }
    setError(null)
    saveFunction({ ...selected, params: next })
  }

  if (!program) {
    return (
      <aside className="functions" aria-label="Function">
        <p className="inspector__hint">Belum ada program.</p>
      </aside>
    )
  }

  return (
    <aside className="functions" aria-label="Function">
      <h2 className="inspector__title">Function</h2>
      <ul className="functions__list">
        {program.functions.map((fn) => (
          <li key={fn.name}>
            <button
              type="button"
              className={`functions__item ${
                fn.name === selected?.name ? 'is-active' : ''
              }`}
              aria-current={fn.name === selected?.name ? 'true' : undefined}
              aria-label={fn.name}
              onClick={() => setSelectedFunction(fn.name)}
            >
              {fn.name}
              <span className="functions__meta">{fn.params.length} param</span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <div className="functions__editor">
          <div className="field">
            <label htmlFor="mf-function-name">Nama function</label>
            <input
              id="mf-function-name"
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              onBlur={rename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
          </div>
          <button
            type="button"
            className="button button--ghost functions__delete"
            aria-label="Hapus function"
            disabled={selected.name.toLowerCase() === 'main'}
            onClick={remove}
          >
            <Trash2 size={15} aria-hidden="true" />
            Hapus function
          </button>

          <fieldset className="functions__params">
            <legend>Parameter</legend>
            {selected.params.map((param, index) => (
              <div className="functions__param" key={index}>
                <ParamName
                  label={`Parameter ${index + 1} nama`}
                  value={param.name}
                  onCommit={(name) => updateParam(index, { name })}
                />
                <select
                  aria-label={`Parameter ${index + 1} tipe`}
                  value={param.type}
                  onChange={(event) =>
                    updateParam(index, { type: event.target.value as ScalarType })
                  }
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <label className="functions__array">
                  <input
                    type="checkbox"
                    checked={param.isArray}
                    onChange={(event) => updateParam(index, { isArray: event.target.checked })}
                  />
                  array
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Hapus parameter ${index + 1}`}
                  onClick={() =>
                    saveFunction({
                      ...selected,
                      params: selected.params.filter((_, position) => position !== index),
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="button button--ghost" onClick={addParam}>
              <Plus size={15} aria-hidden="true" />
              Tambah parameter
            </button>
          </fieldset>
        </div>
      ) : null}

      <div className="functions__add">
        <div className="field">
          <label htmlFor="mf-new-function">Function baru</label>
          <input
            id="mf-new-function"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add()
            }}
          />
        </div>
        <button type="button" className="button button--primary" onClick={add}>
          <Plus size={15} aria-hidden="true" />
          Tambah function
        </button>
      </div>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </aside>
  )
}

function ParamName({
  label,
  value,
  onCommit,
}: {
  label: string
  value: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <input
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
