import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parseFprg } from '../fprg/parse'
import { getTemplate } from '../templates'
import { generate } from './render'

function sample(name: 'factorial' | 'arrays') {
  const parsed = parseFprg(readFileSync(`src/core/templates/samples/${name}.fprg`, 'utf8'))
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.program
}

for (const id of ['python', 'cpp', 'javascript', 'java']) {
  for (const name of ['factorial', 'arrays'] as const) {
    test(`${id} renders the ${name} sample`, () => {
      const template = getTemplate(id)
      expect(template).toBeDefined()
      if (!template) return
      const result = generate(sample(name), template)
      expect(result.code).toMatchSnapshot()
      expect(Object.keys(result.lineMap).length).toBeGreaterThan(0)
    })
  }
}

test('every built-in template renders non-empty code for both samples', async () => {
  const { listTemplates } = await import('../templates')
  for (const item of listTemplates()) {
    if (item.id.startsWith('custom-')) continue
    const template = getTemplate(item.id)
    expect(template, item.id).toBeDefined()
    if (!template) continue
    for (const name of ['factorial', 'arrays'] as const) {
      const result = generate(sample(name), template)
      expect(result.code.trim().length, `${item.id} ${name}`).toBeGreaterThan(0)
    }
  }
})
