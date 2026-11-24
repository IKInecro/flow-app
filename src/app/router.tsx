import { createBrowserRouter } from 'react-router-dom'
import { Shell } from './Shell'
import { ProjectHub } from '../features/projects/ProjectHub'
import { EditorPage } from '../features/editor/EditorPage'
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
      { index: true, element: <ProjectHub /> },
      { path: 'editor/:id', element: <EditorPage /> },
      { path: 'examples', element: <Placeholder title={t('examples.title')} /> },
    ],
  },
])
