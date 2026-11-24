import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parseFprg } from '../fprg/parse'
import { appendStmt, createProgram } from '../model/program'
import type { Program } from '../model/types'
import { generate } from './render'
import { parseTemplate, type Template } from './template'

const pythonish = `
[Language]
name = Python
call = {name}({args})
index = {name}[{index}]
[Program]
line = {main}
[Main]
line = {body}
[Output]
line = print({expression})
[Assign]
line = {target} = {expression}
[Declare]
line = {type} {names}{arraySuffix}
[If]
line = if {condition}:
indent
line = {then}
dedent
else line = else:
else indent
else line = {else}
else dedent
[While]
line = while {condition}:
indent
line = {body}
dedent
[For]
line = for {variable} in range({start}, {end}):
~step line = # step {step}
indent
line = {body}
dedent
[Types]
Integer = int
Real = float
String = str
Boolean = bool
[Literals]
true = True
false = False
`

function template(source: string): Template {
  const parsed = parseTemplate(source)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.template
}

function hello(): Program {
  return appendStmt(createProgram('Hello'), 'Main', {
    kind: 'output',
    expression: '"Hello, world"',
    newline: true,
  })
}

test('renders a hello program and maps the output path to its line', () => {
  const result = generate(hello(), template(pythonish))
  expect(result.code.trim()).toBe('print("Hello, world")')
  expect(result.lineMap['Main:0']).toEqual([1])
})

test('expressions keep precedence and only parenthesize when needed', () => {
  let program = createProgram('Expr')
  program = appendStmt(program, 'Main', {
    kind: 'declare',
    names: ['x'],
    type: 'Integer',
    isArray: false,
    size: '',
  })
  program = appendStmt(program, 'Main', {
    kind: 'assign',
    target: { name: 'x' },
    expression: '(1 + 2) * 3',
  })
  program = appendStmt(program, 'Main', {
    kind: 'assign',
    target: { name: 'x' },
    expression: '1 + 2 * 3',
  })

  const code = generate(program, template(pythonish)).code
  expect(code).toContain('x = (1 + 2) * 3')
  expect(code).toContain('x = 1 + 2 * 3')
})

test('indentation directives indent nested blocks', () => {
  const program = appendStmt(createProgram('Loop'), 'Main', {
    kind: 'while',
    condition: 'True',
    body: [{ kind: 'output', expression: '"x"', newline: true }],
  })
  const code = generate(program, template(pythonish)).code
  expect(code).toBe('while True:\n  print("x")\n')
})

test('flags exclude step lines when the step is the default', () => {
  function loop(step: string): Program {
    return appendStmt(createProgram('For'), 'Main', {
      kind: 'for',
      variable: 'i',
      start: '0',
      end: '3',
      step,
      direction: 'inc',
      body: [{ kind: 'output', expression: 'i', newline: true }],
    })
  }

  expect(generate(loop('1'), template(pythonish)).code).not.toContain('# step')
  expect(generate(loop('2'), template(pythonish)).code).toContain('# step 2')
})

test('else lines render only when the branch exists', () => {
  function branch(withElse: boolean): Program {
    return appendStmt(createProgram('If'), 'Main', {
      kind: 'if',
      condition: 'True',
      then: [{ kind: 'output', expression: '"yes"', newline: true }],
      else: withElse ? [{ kind: 'output', expression: '"no"', newline: true }] : [],
    })
  }

  expect(generate(branch(false), template(pythonish)).code).toBe(
    'if True:\n  print("yes")\n',
  )
  expect(generate(branch(true), template(pythonish)).code).toBe(
    'if True:\n  print("yes")\nelse:\n  print("no")\n',
  )
})

test('special placeholders and brace escaping', () => {
  const source = pythonish.replace(
    'line = print({expression})',
    'line = print({{ {pipe}{space}{expression})',
  )
  const result = generate(hello(), template(source))
  expect(result.code.trim()).toBe('print({ | "Hello, world")')
})

test('line map covers nested statements', () => {
  const program = appendStmt(createProgram('If'), 'Main', {
    kind: 'if',
    condition: 'True',
    then: [{ kind: 'output', expression: '"yes"', newline: true }],
    else: [],
  })
  const result = generate(program, template(pythonish))
  expect(result.lineMap['Main:0']).toEqual([1])
  expect(result.lineMap['Main:0/then/0']).toEqual([2])
})

test('renders non-main functions from the sample fixture', () => {
  const parsed = parseFprg(readFileSync('src/core/templates/samples/factorial.fprg', 'utf8'))
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return

  const source =
    pythonish.replace('[Program]\nline = {main}', '[Program]\nline = {functions}\nline = {main}') +
    `
[Function]
line = def {name}({params}):
indent
line = {body}
dedent
[Param]
line = {name}
[Call]
line = {function}({args})
`
  const result = generate(parsed.program, template(source))
  expect(result.code).toContain('def Factorial(n):')
  expect(result.code).toContain('result = 1')
  expect(result.code).toContain('result = n * Factorial(n - 1)')
  expect(result.code.trim().endsWith('print(Factorial(5))')).toBe(true)
  expect(result.lineMap['Factorial:1/then/0']).toBeDefined()
})
