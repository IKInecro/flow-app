import { expect, test } from 'vitest'
import type { FunctionDef, Stmt } from '../model/types'
import { NODE_SIZE, layoutFunction } from './layout'

function sample(): FunctionDef {
  return {
    name: 'Main',
    returnType: 'None',
    returnVariable: '',
    params: [],
    body: [
      {
        kind: 'if',
        condition: 'x > 0',
        then: [
          {
            kind: 'while',
            condition: 'x < 10',
            body: [
              { kind: 'assign', target: { name: 'x' }, expression: 'x + 1' },
              { kind: 'output', expression: 'x', newline: true },
            ],
          },
        ],
        else: [{ kind: 'output', expression: '"negatif"', newline: true }],
      },
      {
        kind: 'for',
        variable: 'i',
        start: '0',
        end: '2',
        step: '1',
        direction: 'inc',
        body: [{ kind: 'declare', names: ['i'], type: 'Integer', isArray: false, size: '' }],
      },
      { kind: 'comment', text: 'selesai' },
    ],
  }
}

function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

test('node ids follow statement paths and include terminators', () => {
  const { nodes } = layoutFunction(sample())
  const ids = nodes.map((node) => node.id)
  expect(ids).toContain('__start')
  expect(ids).toContain('__end')
  expect(ids).toContain('0')
  expect(ids).toContain('0/then/0')
  expect(ids).toContain('0/then/0/body/1')
  expect(ids).toContain('0/else/0')
  expect(ids).toContain('1')
  expect(ids).toContain('1/body/0')
  expect(ids).toContain('2')

  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  expect(nodesById.get('0')?.kind).toBe('if')
  expect(nodesById.get('0/then/0')?.kind).toBe('while')
  expect(nodesById.get('0/then/0/body/1')?.kind).toBe('output')
  expect(nodesById.get('1')?.kind).toBe('for')
})

test('if and loops have labeled branch edges', () => {
  const { edges } = layoutFunction(sample())
  const labels = (source: string) =>
    edges
      .filter((edge) => edge.source === source)
      .map((edge) => edge.label)
      .sort()

  expect(labels('0')).toEqual(['Else', 'Then'])
  expect(labels('0/then/0')).toEqual(['No', 'Yes'])
  expect(labels('1')).toEqual(['No', 'Yes'])
})

test('loops include a back edge from the body exit', () => {
  const { edges } = layoutFunction(sample())
  expect(edges.some((edge) => edge.source === '0/then/0/body/1' && edge.target === '0/then/0')).toBe(
    true,
  )
})

test('edges only reference existing nodes', () => {
  const { nodes, edges } = layoutFunction(sample())
  const ids = new Set(nodes.map((node) => node.id))
  for (const edge of edges) {
    expect(ids.has(edge.source)).toBe(true)
    expect(ids.has(edge.target)).toBe(true)
  }
})

test('nested bodies sit below their condition', () => {
  const { nodes } = layoutFunction(sample())
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const outer = nodesById.get('0')
  const inner = nodesById.get('0/then/0')
  const loopBody = nodesById.get('0/then/0/body/0')
  expect(outer && inner && loopBody).toBeTruthy()
  if (!outer || !inner || !loopBody) return
  expect(inner.y).toBeGreaterThan(outer.y + outer.height)
  expect(loopBody.y).toBeGreaterThan(inner.y + inner.height)
})

test('node rectangles never overlap', () => {
  const { nodes } = layoutFunction(sample())
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      expect(rectsOverlap(nodes[i], nodes[j])).toBe(false)
    }
  }
})

test('layout is deterministic', () => {
  expect(layoutFunction(sample())).toEqual(layoutFunction(sample()))
})

test('node sizes cover every statement kind', () => {
  const kinds: Stmt['kind'][] = [
    'declare',
    'assign',
    'input',
    'output',
    'if',
    'while',
    'do',
    'for',
    'call',
    'comment',
    'breakpoint',
    'turtle',
    'file',
    'unsupported',
  ]
  for (const kind of kinds) {
    expect(NODE_SIZE[kind]?.width).toBeGreaterThan(0)
    expect(NODE_SIZE[kind]?.height).toBeGreaterThan(0)
  }
})

test('a loop body and its exit merge stay on the header axis', () => {
  const { nodes } = layoutFunction(sample())
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const header = byId.get('0/then/0')
  const body = byId.get('0/then/0/body/0')
  const merge = byId.get('merge:0/then/0')
  expect(header && body && merge).toBeTruthy()
  if (!header || !body || !merge) return

  const axis = header.x + header.width / 2
  expect(body.x + body.width / 2).toBeCloseTo(axis, 0)
  expect(merge.x + merge.width / 2).toBeCloseTo(axis, 0)
})

test('loop connectors run in lanes outside the body', () => {
  const { nodes, edges } = layoutFunction(sample())
  const body = nodes.filter((node) => node.id.startsWith('0/then/0/body/'))
  const left = Math.min(...body.map((node) => node.x))
  const right = Math.max(...body.map((node) => node.x + node.width))

  const exit = edges.find((edge) => edge.source === '0/then/0' && edge.label === 'No')
  const back = edges.find((edge) => edge.target === '0/then/0')

  expect(exit?.route?.kind).toBe('loop-exit')
  expect(exit?.route?.laneX).toBeLessThan(left)
  expect(back?.route?.kind).toBe('loop-back')
  expect(back?.route?.laneX).toBeGreaterThan(right)
})
