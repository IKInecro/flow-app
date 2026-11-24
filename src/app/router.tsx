import { createBrowserRouter } from 'react-router-dom'
import { Shell } from './Shell'
import { ProjectHub } from '../features/projects/ProjectHub'
import { EditorPage } from '../features/editor/EditorPage'
import { SampleGallery } from '../features/projects/SampleGallery'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <ProjectHub /> },
      { path: 'editor/:id', element: <EditorPage /> },
      {
        path: 'examples',
        element: (
          <div className="page">
            <SampleGallery />
          </div>
        ),
      },
    ],
  },
])
