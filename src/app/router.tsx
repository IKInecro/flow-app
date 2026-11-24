import { createBrowserRouter } from 'react-router-dom'
import { Shell } from './Shell'
import { t } from '../shared/i18n'

function Placeholder({ title }: { title: string }) {
  return (
    <section className="placeholder">
      <h1>{title}</h1>
    </section>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Placeholder title={t('hub.title')} /> },
      { path: 'editor/:id', element: <Placeholder title={t('editor.title')} /> },
      { path: 'examples', element: <Placeholder title={t('examples.title')} /> },
    ],
  },
])
