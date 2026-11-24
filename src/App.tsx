import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { ThemeProvider } from './app/ThemeProvider'

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
