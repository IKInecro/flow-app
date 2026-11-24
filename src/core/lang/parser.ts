import { canonicalOp, type BinaryOp, type Expr, type ParseResult, type UnaryOp } from './ast'
import { LexError, tokenize, type Token } from './lexer'

class ParseError extends Error {
  position: number

  constructor(message: string, position: number) {
    super(message)
    this.position = position
  }
}

const BINARY: Record<string, { precedence: number; rightAssociative?: boolean }> = {
  or: { precedence: 1 },
  and: { precedence: 2 },
  '>': { precedence: 3 },
  '<': { precedence: 3 },
  '>=': { precedence: 3 },
  '<=': { precedence: 3 },
  '==': { precedence: 3 },
  '!=': { precedence: 3 },
  '&': { precedence: 4 },
  '+': { precedence: 5 },
  '-': { precedence: 5 },
  '*': { precedence: 6 },
  '/': { precedence: 6 },
  '%': { precedence: 6 },
  '^': { precedence: 7, rightAssociative: true },
}

const UNARY_SYMBOLS = new Set(['-', '!', '¬'])

class Parser {
  private tokens: Token[]
  private index = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token {
    return this.tokens[this.index]
  }

  private next(): Token {
    const token = this.tokens[this.index]
    this.index += 1
    return token
  }

  private expect(type: Token['type'], message: string): Token {
    const token = this.peek()
    if (token.type !== type) throw new ParseError(message, token.position)
    return this.next()
  }

  parse(minPrecedence = 0): Expr {
    let left = this.parsePrefix()

    for (;;) {
      const token = this.peek()
      const raw =
        token.type === 'operator'
          ? token.value
          : token.type === 'identifier'
            ? token.value.toLowerCase()
            : null
      if (raw === null) break

      const canonical = canonicalOp(raw as BinaryOp)
      const info = BINARY[canonical]
      if (!info || info.precedence < minPrecedence) break

      this.next()
      const nextMin = info.rightAssociative ? info.precedence : info.precedence + 1
      const right = this.parse(nextMin)
      left = { kind: 'binary', op: canonical as BinaryOp, left, right }
    }

    return left
  }

  private parsePrefix(): Expr {
    const token = this.next()

    if (token.type === 'number') {
      return { kind: 'number', value: Number(token.value), isInt: !token.value.includes('.') }
    }

    if (token.type === 'string') {
      return { kind: 'string', value: token.value }
    }

    if (token.type === 'operator' && UNARY_SYMBOLS.has(token.value)) {
      return {
        kind: 'unary',
        op: (token.value === '¬' ? 'not' : token.value) as UnaryOp,
        operand: this.parse(8),
      }
    }

    if (token.type === 'lparen') {
      const expr = this.parse(0)
      this.expect('rparen', 'Kurung tutup ")" tidak ditemukan.')
      return expr
    }

    if (token.type === 'identifier') {
      const lower = token.value.toLowerCase()
      if (lower === 'true') return { kind: 'boolean', value: true }
      if (lower === 'false') return { kind: 'boolean', value: false }
      if (lower === 'pi') return { kind: 'number', value: Math.PI, isInt: false }
      if (lower === 'not') {
        return { kind: 'unary', op: 'not', operand: this.parse(8) }
      }
      return this.parsePostfix(token.value)
    }

    if (token.type === 'eof') throw new ParseError('Ekspresi kosong.', token.position)
    throw new ParseError(`Token tidak terduga: ${token.value || token.type}`, token.position)
  }

  private parsePostfix(name: string): Expr {
    if (this.peek().type === 'lparen') {
      this.next()
      const args: Expr[] = []
      if (this.peek().type !== 'rparen') {
        for (;;) {
          args.push(this.parse(0))
          if (this.peek().type === 'comma') {
            this.next()
            continue
          }
          break
        }
      }
      this.expect('rparen', 'Kurung tutup ")" tidak ditemukan.')
      return { kind: 'call', name, args }
    }

    let expr: Expr = { kind: 'identifier', name }
    while (this.peek().type === 'lbracket') {
      this.next()
      const index = this.parse(0)
      this.expect('rbracket', 'Kurung tutup "]" tidak ditemukan.')
      if (expr.kind !== 'identifier' && expr.kind !== 'index') {
        throw new ParseError('Index hanya berlaku untuk variabel.', this.peek().position)
      }
      expr = { kind: 'index', name: expr.name, index }
    }
    return expr
  }

  expectEnd(): void {
    const token = this.peek()
    if (token.type !== 'eof') throw new ParseError('Ekspresi memiliki sisa token.', token.position)
  }
}

export function parseExpression(source: string): ParseResult<Expr> {
  try {
    const parser = new Parser(tokenize(source))
    const expr = parser.parse(0)
    parser.expectEnd()
    return { ok: true, expr }
  } catch (error) {
    if (error instanceof LexError || error instanceof ParseError) {
      return { ok: false, error: { message: error.message, position: error.position } }
    }
    return { ok: false, error: { message: 'Ekspresi tidak valid.', position: 0 } }
  }
}
