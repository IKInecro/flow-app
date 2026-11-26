import 'fake-indexeddb/auto'
import { clear } from 'idb-keyval'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createProgram } from '../../core/model/program'
import { projectStore } from '../../shared/storage/db'
import { createProjectRecord, listProjects, putProject } from '../../shared/storage/projects'
import { ProjectHub } from './ProjectHub'

beforeEach(async () => {
  vi.restoreAllMocks()
  await clear(projectStore)
})

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProjectHub />} />
        <Route path="/editor/:id" element={<div>editor-page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

test('shows an empty state and creates a project', async () => {
  renderHub()
  expect(await screen.findByText(/no projects yet/i, {}, { timeout: 8000 })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /new project/i }))
  expect(await screen.findByText('editor-page', {}, { timeout: 12000 })).toBeInTheDocument()
  await waitFor(async () => expect(await listProjects()).toHaveLength(1))
})

test('lists existing projects', async () => {
  const record = createProjectRecord('My Algorithm')
  record.program = createProgram('My Algorithm')
  await putProject(record)

  renderHub()
  expect(await screen.findByText('My Algorithm', {}, { timeout: 8000 })).toBeInTheDocument()
})

test('invalid import shows an error and keeps the current list', async () => {
  renderHub()
  await screen.findByText(/no projects yet/i, {}, { timeout: 8000 })
  const input = screen.getByLabelText(/import .fprg/i)
  await userEvent.upload(input, new File(['<nope/>'], 'bad.fprg', { type: 'application/xml' }))
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toMatch(/invalid|could not|not a/i)
})
