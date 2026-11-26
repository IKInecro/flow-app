import { expect, test } from 'vitest'
import type { FunctionDef } from '../model/types'
import { insertPointForEdge } from './edgeInsert'
import { layoutFunction } from './layout'

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
        then: [{ kind: 'output', expression: 'x', newline: true }],
        else: [],
      },
      {
        kind: 'while',
        condition: 'x < 3',
        body: [{ kind: 'assign', target: { name: 'x' }, expression: 'x + 1' }],
      },
    ],
  }
}

test('a sequential connector inserts before its target', () => {
  const { nodes, edges } = layoutFunction(sample())
  const first = edges.find((edge) => edge.source === '__start')
  expect(first).toBeTruthy()
  expect(first && insertPointForEdge(first, nodes)).toEqual({
    kind: 'insert',
    path: '0',
    position: 'before',
  })
})

test('empty branches append into the matching side', () => {
  const { nodes, edges } = layoutFunction(sample())
  const elseEdge = edges.find((edge) => edge.label === 'Else')
  expect(elseEdge && insertPointForEdge(elseEdge, nodes)).toEqual({
    kind: 'insert',
    path: '0',
    position: 'into-else',
  })
})

test('loop lanes append to the body and continue after the loop', () => {
  const { nodes, edges } = layoutFunction(sample())
  const back = edges.find((edge) => edge.route?.kind === 'loop-back')
  const exit = edges.find((edge) => edge.route?.kind === 'loop-exit')

  expect(back && insertPointForEdge(back, nodes)).toEqual({
    kind: 'insert',
    path: '1',
    position: 'into-body',
  })
  expect(exit && insertPointForEdge(exit, nodes)).toEqual({
    kind: 'insert',
    path: '1',
    position: 'after',
  })
})

test('the final connector inserts after the last block', () => {
  const { nodes, edges } = layoutFunction(sample())
  const intoEnd = edges.find((edge) => edge.target === '__end')
  expect(intoEnd && insertPointForEdge(intoEnd, nodes)).toEqual({
    kind: 'insert',
    path: '1',
    position: 'after',
  })
})

test('an empty function offers append on the start-to-end connector', () => {
  const { nodes, edges } = layoutFunction({
    name: 'Main',
    returnType: 'None',
    returnVariable: '',
    params: [],
    body: [],
  })
  expect(insertPointForEdge(edges[0], nodes)).toEqual({ kind: 'append' })
})
