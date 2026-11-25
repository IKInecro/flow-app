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
    functions: program.functions.map((item) =>
      item.name.toLowerCase() === fn.name.toLowerCase() ? fn : item,
    ),
  }
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
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
      setError('A function name is required.')
      return
    }
    if (next === selected.name) return
    if (conflict(next, selected.name)) {
      setError('That function name is already taken.')
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
      setError('A function name is required.')
      return
    }
    if (conflict(next)) {
      setError('That function name is already taken.')
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
      setError('A parameter name is required.')
      return
    }
    if (new Set(names).size !== names.length) {
      setError('Parameter names must be unique.')
      return
    }
    setError(null)
    saveFunction({ ...selected, params: next })
  }

  if (!program) {
    return (
      <aside className="functions" aria-label="Function">
        <p className="inspector__hint">No program yet.</p>
      </aside>
    )
  }

  return (
    <aside className="functions" aria-label="Function">
      <header className="fn-head">
        <div>
          <h2 className="inspector__title">Functions</h2>
          <p className="fn-head__hint">
            {program.functions.length} {program.functions.length === 1 ? 'function' : 'functions'}
          </p>
        </div>
      </header>

      <ul className="fn-list">
        {program.functions.map((fn) => {
          const active = fn.name === selected?.name
          return (
            <li key={fn.name}>
              <button
                type="button"
                className={`fn-item ${active ? 'is-active' : ''}`}
                aria-current={active ? 'true' : undefined}
                aria-label={fn.name}
                onClick={() => setSelectedFunction(fn.name)}
              >
                <span className="fn-item__avatar" aria-hidden="true">
                  {initials(fn.name)}
                </span>
                <span className="fn-item__copy">
                  <strong>{fn.name}</strong>
                  <small>
                    {fn.params.length} {fn.params.length === 1 ? 'param' : 'params'}
                    {fn.returnType !== 'None' ? ` · ${fn.returnType}` : ''}
                  </small>
                </span>
                {active ? <span className="fn-item__dot" aria-hidden="true" /> : null}
              </button>
            </li>
          )
        })}
      </ul>

      {selected ? (
        <section className="fn-editor" aria-label="Selected function">
          <div className="fn-editor__head">
            <div>
              <span className="fn-eyebrow">Editing</span>
              <strong>{selected.name}</strong>
            </div>
            <button
              type="button"
              className="fn-delete"
              aria-label="Delete function"
              title={
                selected.name.toLowerCase() === 'main'
                  ? 'Main cannot be deleted'
                  : 'Delete this function'
              }
              disabled={selected.name.toLowerCase() === 'main'}
              onClick={remove}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="fn-card">
            <div className="field">
              <label htmlFor="mf-function-name">Function name</label>
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
          </div>

          <fieldset className="fn-params">
            <legend>
              Parameters
              <span>{selected.params.length}</span>
            </legend>
            {selected.params.map((param, index) => (
              <div className="fn-param" key={index}>
                <ParamName
                  label={`Parameter ${index + 1} name`}
                  value={param.name}
                  onCommit={(name) => updateParam(index, { name })}
                />
                <select
                  aria-label={`Parameter ${index + 1} type`}
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
                <label className="fn-param__array">
                  <input
                    type="checkbox"
                    checked={param.isArray}
                    onChange={(event) => updateParam(index, { isArray: event.target.checked })}
                  />
                  <span>Array</span>
                </label>
                <button
                  type="button"
                  className="fn-param__delete"
                  aria-label={`Delete parameter ${index + 1}`}
                  onClick={() =>
                    saveFunction({
                      ...selected,
                      params: selected.params.filter((_, position) => position !== index),
                    })
                  }
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" className="fn-add-param" onClick={addParam}>
              <Plus size={14} aria-hidden="true" />
              Add parameter
            </button>
          </fieldset>
        </section>
      ) : null}

      <div className="fn-add">
        <div className="field">
          <label htmlFor="mf-new-function">New function</label>
          <input
            id="mf-new-function"
            value={newName}
            placeholder="e.g. PrintTotal"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add()
            }}
          />
        </div>
        <button type="button" className="button button--primary fn-add__button" onClick={add}>
          <Plus size={15} aria-hidden="true" />
          Add function
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
