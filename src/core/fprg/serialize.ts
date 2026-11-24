import type { LValue, Program, Stmt } from '../model/types'

const PAD = '    '

export function escAttr(value: string): string {
  let result = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (char === '&') result += '&amp;'
    else if (char === '<') result += '&lt;'
    else if (char === '>') result += '&gt;'
    else if (char === '"') result += '&quot;'
    else if (code < 32 || code > 126) result += `&#${code};`
    else result += char
  }
  return result
}

function lvalueText(value: LValue): string {
  return value.index === undefined ? value.name : `${value.name}[${value.index}]`
}

function attrs(entries: [string, string][]): string {
  return entries.map(([name, value]) => `${name}="${escAttr(value)}"`).join(' ')
}

function stmtLines(stmt: Stmt, level: number): string[] {
  const indent = PAD.repeat(level)
  switch (stmt.kind) {
    case 'declare':
      return [
        `${indent}<declare ${attrs([
          ['name', stmt.names.join(', ')],
          ['type', stmt.type],
          ['array', stmt.isArray ? 'True' : 'False'],
          ['size', stmt.size],
        ])}/>`,
      ]
    case 'assign':
      return [
        `${indent}<assign ${attrs([
          ['variable', lvalueText(stmt.target)],
          ['expression', stmt.expression],
        ])}/>`,
      ]
    case 'input':
      return [`${indent}<input ${attrs([['variable', lvalueText(stmt.variable)]])}/>`]
    case 'output':
      return [
        `${indent}<output ${attrs([
          ['expression', stmt.expression],
          ['newline', stmt.newline ? 'True' : 'False'],
        ])}/>`,
      ]
    case 'if':
      return [
        `${indent}<if ${attrs([['expression', stmt.condition]])}>`,
        `${indent}<then>`,
        ...stmt.then.flatMap((child) => stmtLines(child, level + 1)),
        `${indent}</then>`,
        `${indent}<else>`,
        ...stmt.else.flatMap((child) => stmtLines(child, level + 1)),
        `${indent}</else>`,
        `${indent}</if>`,
      ]
    case 'while':
      return [
        `${indent}<while ${attrs([['expression', stmt.condition]])}>`,
        `${indent}${PAD}<body>`,
        ...stmt.body.flatMap((child) => stmtLines(child, level + 2)),
        `${indent}${PAD}</body>`,
        `${indent}</while>`,
      ]
    case 'do':
      return [
        `${indent}<do ${attrs([['expression', stmt.condition]])}>`,
        `${indent}${PAD}<body>`,
        ...stmt.body.flatMap((child) => stmtLines(child, level + 2)),
        `${indent}${PAD}</body>`,
        `${indent}</do>`,
      ]
    case 'for':
      return [
        `${indent}<for ${attrs([
          ['variable', stmt.variable],
          ['start', stmt.start],
          ['end', stmt.end],
          ['direction', stmt.direction],
          ['step', stmt.step],
        ])}>`,
        `${indent}${PAD}<body>`,
        ...stmt.body.flatMap((child) => stmtLines(child, level + 2)),
        `${indent}${PAD}</body>`,
        `${indent}</for>`,
      ]
    case 'call':
      return [
        `${indent}<call ${attrs([
          ['expression', `${stmt.functionName}(${stmt.args.join(', ')})`],
        ])}/>`,
      ]
    case 'comment':
      return [`${indent}<comment ${attrs([['text', stmt.text]])}/>`]
    case 'breakpoint':
      return [
        `${indent}<breakpoint${stmt.condition ? ` ${attrs([['expression', stmt.condition]])}` : ''}/>`,
      ]
    case 'turtle':
    case 'file':
      return [
        `${indent}<${stmt.op}${Object.keys(stmt.fields).length ? ` ${attrs(Object.entries(stmt.fields))}` : ''}/>`,
      ]
    case 'unsupported':
      return [`${indent}${stmt.rawXml.trim()}`]
  }
}

function functionLines(program: Program, functionIndex: number): string[] {
  const fn = program.functions[functionIndex]
  if (!fn) return []
  const lines = [
    `<function ${attrs([
      ['name', fn.name],
      ['type', fn.returnType],
      ['variable', fn.returnVariable],
    ])}>`,
  ]

  if (fn.params.length === 0) {
    lines.push(`${PAD}<parameters/>`)
  } else {
    lines.push(`${PAD}<parameters>`)
    for (const param of fn.params) {
      lines.push(
        `${PAD.repeat(2)}<parameter ${attrs([
          ['name', param.name],
          ['type', param.type],
          ['array', param.isArray ? 'True' : 'False'],
        ])}/>`,
      )
    }
    lines.push(`${PAD}</parameters>`)
  }

  lines.push(`${PAD}<body>`)
  lines.push(...fn.body.flatMap((stmt) => stmtLines(stmt, 2)))
  lines.push(`${PAD}</body>`)
  lines.push('</function>')
  return lines
}

export function serializeFprg(program: Program): string {
  const lines: string[] = ['<?xml version="1.0"?>', `<flowgorithm ${attrs([['fileversion', program.fileVersion]])}>`]
  lines.push(`${PAD}<attributes>`)
  lines.push(`${PAD.repeat(2)}<attribute ${attrs([['name', 'name'], ['value', program.meta.name]])}/>`)
  lines.push(`${PAD.repeat(2)}<attribute ${attrs([['name', 'authors'], ['value', program.meta.authors]])}/>`)
  lines.push(`${PAD.repeat(2)}<attribute ${attrs([['name', 'about'], ['value', program.meta.about]])}/>`)
  if (program.meta.saved) {
    lines.push(`${PAD.repeat(2)}<attribute ${attrs([['name', 'saved'], ['value', program.meta.saved]])}/>`)
  }
  if (program.meta.created) {
    lines.push(`${PAD.repeat(2)}<attribute ${attrs([['name', 'created'], ['value', program.meta.created]])}/>`)
  }
  for (const edited of program.meta.edited ?? []) {
    lines.push(`${PAD.repeat(2)}<attribute ${attrs([['name', 'edited'], ['value', edited]])}/>`)
  }
  lines.push(`${PAD}</attributes>`)

  for (let index = 0; index < program.functions.length; index += 1) {
    lines.push(...functionLines(program, index))
  }
  for (const raw of program.unknown ?? []) lines.push(raw)

  lines.push('</flowgorithm>')
  return `${lines.join('\n')}\n`
}
