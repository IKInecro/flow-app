import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'
import { useUiStore } from '../editor/store/uiStore'
import { useRuntimeStore } from './runtimeStore'
import { ConsoleDock } from './ConsoleDock'

beforeEach(() => {
  useRuntimeStore.setState({
    status: 'done',
    activePath: null,
    entries: [],
    variables: [],
    callStack: [],
  })
  useUiStore.setState({ consoleMode: 'chat' })
  localStorage.removeItem('marcoflow.console')
})

test('renders output and input bubbles with their colors', () => {
  useRuntimeStore.setState({
    entries: [
      { kind: 'output', text: 'halo' },
      { kind: 'input', text: '42' },
      { kind: 'error', text: 'gagal', path: '0' },
      { kind: 'system', text: 'info' },
    ],
  })

  render(<ConsoleDock />)

  expect(screen.getByLabelText('Console')).toHaveAttribute('aria-live', 'polite')

  const output = screen.getByText('halo').closest('.console-entry')
  const input = screen.getByText('42').closest('.console-entry')
  expect(output).toHaveClass('console-entry--output')
  expect(input).toHaveClass('console-entry--input')
})

test('reset clears the console and returns it to ready', async () => {
  useRuntimeStore.setState({
    status: 'error',
    entries: [{ kind: 'error', text: 'A declaration needs a variable name.', path: '0' }],
    variables: [{ functionName: 'Main', name: 'n', type: 'Integer', value: '0' }],
    callStack: [{ functionName: 'Main' }],
    error: { message: 'boom', function: 'Main', path: '0', callStack: [] },
  })

  render(<ConsoleDock />)
  await userEvent.click(screen.getByRole('button', { name: 'Reset console' }))

  expect(useRuntimeStore.getState().status).toBe('idle')
  expect(useRuntimeStore.getState().entries).toEqual([])
  expect(useRuntimeStore.getState().variables).toEqual([])
  expect(screen.getByText(/run a program to see its output/i)).toBeInTheDocument()
})


test('plain mode renders every line in a pre', async () => {
  useRuntimeStore.setState({
    entries: [
      { kind: 'output', text: 'halo' },
      { kind: 'input', text: '42' },
      { kind: 'error', text: 'gagal', path: '0' },
    ],
  })

  render(<ConsoleDock />)
  await userEvent.click(screen.getByRole('button', { name: /plain|teks/i }))

  const pre = screen.getByTestId('console-plain')
  expect(pre.tagName).toBe('PRE')
  expect(pre).toHaveTextContent('halo')
  expect(pre).toHaveTextContent('42')
  expect(pre).toHaveTextContent('gagal')
})
