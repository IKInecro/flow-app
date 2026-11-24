export type TokenType =
  | 'number'
  | 'string'
  | 'identifier'
  | 'operator'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'comma'
  | 'eof'

export interface Token {
  type: TokenType
  value: string
  position: number
}

export class LexError extends Error {
  position: number

  constructor(message: string, position: number) {
    super(message)
    this.position = position
  }
}

const MULTI_OPS = ['>=', '<=', '==', '!=', '<>', '&&', '||']
const SINGLE_OPS = '+-*/%^&><!:=×÷≥≤≠∧∨¬↑'
const PUNCTUATION: Record<string, TokenType> = {
  '(': 'lparen',
  ')': 'rparen',
  '[': 'lbracket',
  ']': 'rbracket',
  ',': 'comma',
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9'
}

function isLetter(char: string): boolean {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (isDigit(char)) {
      const start = index
      while (index < source.length && isDigit(source[index])) index += 1
      if (source[index] === '.') {
        index += 1
        while (index < source.length && isDigit(source[index])) index += 1
      }
      tokens.push({ type: 'number', value: source.slice(start, index), position: start })
      continue
    }

    if (char === '"') {
      const start = index
      index += 1
      let value = ''
      let closed = false
      while (index < source.length) {
        const current = source[index]
        if (current === '\\') {
          const next = source[index + 1]
          if (next === '"' || next === '\\') {
            value += next
            index += 2
            continue
          }
          value += current
          index += 1
          continue
        }
        if (current === '"') {
          closed = true
          index += 1
          break
        }
        value += current
        index += 1
      }
      if (!closed) throw new LexError('String literal is not closed.', start)
      tokens.push({ type: 'string', value, position: start })
      continue
    }

    if (isLetter(char)) {
      const start = index
      while (index < source.length && (isLetter(source[index]) || isDigit(source[index]))) {
        index += 1
      }
      tokens.push({ type: 'identifier', value: source.slice(start, index), position: start })
      continue
    }

    const pair = source.slice(index, index + 2)
    if (MULTI_OPS.includes(pair)) {
      tokens.push({ type: 'operator', value: pair, position: index })
      index += 2
      continue
    }

    const punctuation = PUNCTUATION[char]
    if (punctuation) {
      tokens.push({ type: punctuation, value: char, position: index })
      index += 1
      continue
    }

    if (SINGLE_OPS.includes(char)) {
      tokens.push({ type: 'operator', value: char, position: index })
      index += 1
      continue
    }

    throw new LexError(`Unknown character: ${char}`, index)
  }

  tokens.push({ type: 'eof', value: '', position: source.length })
  return tokens
}
