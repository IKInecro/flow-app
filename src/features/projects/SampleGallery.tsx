import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import { parseFprg } from '../../core/fprg/parse'
import { createProjectRecord, putProject } from '../../shared/storage/projects'

const sources = import.meta.glob('./samples/*.fprg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

interface SampleMeta {
  id: string
  name: string
  description: string
  level: string
}

const META: SampleMeta[] = [
  {
    id: 'hello',
    name: 'Hello World',
    description: 'One output node to get you started.',
    level: 'Beginner',
  },
  {
    id: 'factorial',
    name: 'Factorial',
    description: 'A recursive function with a parameter and a return value.',
    level: 'Intermediate',
  },
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    description: 'Arrays, nested loops, and swapping values.',
    level: 'Intermediate',
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    description: 'Two recursive calls in one expression.',
    level: 'Advanced',
  },
]

export interface Sample extends SampleMeta {
  source: string
}

export const samples: Sample[] = META.map((meta) => ({
  ...meta,
  source: sources[`./samples/${meta.id}.fprg`] ?? '',
}))

export function SampleGallery() {
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)

  async function open(sample: Sample): Promise<void> {
    const parsed = parseFprg(sample.source)
    if (!parsed.ok) {
      setMessage(`Could not open example "${sample.name}": ${parsed.error}`)
      return
    }
    const record = createProjectRecord(parsed.program.meta.name || sample.name)
    record.program = parsed.program
    const saved = await putProject(record)
    navigate(`/editor/${saved.id}`)
  }

  return (
    <section className="samples" aria-label="Example programs">
      <header className="samples__head">
        <h2>
          <BookOpen size={16} aria-hidden="true" />
          Example programs
        </h2>
        <p>Start from a flowchart that already runs, then make it your own.</p>
      </header>

      {message ? (
        <p className="toast toast--error" role="alert">
          {message}
        </p>
      ) : null}

      <div className="samples__grid">
        {samples.map((sample) => (
          <article className="sample" key={sample.id}>
            <div className="sample__meta">
              <span className="sample__level">{sample.level}</span>
              <h3>{sample.name}</h3>
              <p>{sample.description}</p>
            </div>
            <button
              type="button"
              className="button button--ghost sample__open"
              aria-label={`Open example ${sample.name}`}
              onClick={() => void open(sample)}
            >
              Open example
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
