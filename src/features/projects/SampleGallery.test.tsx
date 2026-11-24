import 'fake-indexeddb/auto'
import { clear } from 'idb-keyval'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { checkProgram } from '../../core/lang/validate'
import { parseFprg } from '../../core/fprg/parse'
import { createRunController } from '../run/controller'
import { projectStore } from '../../shared/storage/db'
import { listProjects } from '../../shared/storage/projects'
import { SampleGallery, samples } from './SampleGallery'

beforeEach(async () => {
  await clear(projectStore)
})

function renderGallery() {
  return render(
    <MemoryRouter initialEntries={['/examples']}>
      <Routes>
        <Route path="/examples" element={<SampleGallery />} />
        <Route path="/editor/:id" element={<div>editor-page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

test('shows the four authored samples', () => {
  renderGallery()

  expect(screen.getByRole('heading', { name: /example programs/i })).toBeInTheDocument()
  for (const name of ['Hello World', 'Factorial', 'Bubble Sort', 'Fibonacci']) {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
  }
  expect(screen.getAllByRole('button', { name: /open example/i })).toHaveLength(4)
})

test('every sample parses, validates, and runs to completion', async () => {
  for (const sample of samples) {
    expect(sample.source.length, sample.id).toBeGreaterThan(0)
    const parsed = parseFprg(sample.source)
    expect(parsed.ok, `${sample.id}: ${parsed.ok ? '' : parsed.error}`).toBe(true)
    if (!parsed.ok) continue

    expect(checkProgram(parsed.program).filter((item) => item.severity === 'error')).toEqual([])

    const controller = createRunController(() => undefined)
    await controller.start(parsed.program, { ignoreBreakpoints: true })
    expect(controller.getState().status, sample.id).toBe('done')
  }
})

test('opening a sample stores a project and navigates to the editor', async () => {
  renderGallery()

  await userEvent.click(screen.getByRole('button', { name: /open example factorial/i }))
  expect(await screen.findByText('editor-page')).toBeInTheDocument()

  const projects = await listProjects()
  expect(projects).toHaveLength(1)
  expect(projects[0].program.functions.map((fn) => fn.name)).toContain('Factorial')
})
