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
    name: 'Halo Dunia',
    description: 'Satu node output untuk memulai.',
    level: 'Pemula',
  },
  {
    id: 'factorial',
    name: 'Faktorial',
    description: 'Fungsi rekursif dengan parameter dan return.',
    level: 'Menengah',
  },
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    description: 'Array, nested loop, dan pertukaran nilai.',
    level: 'Menengah',
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    description: 'Dua pemanggilan rekursif dalam satu ekspresi.',
    level: 'Lanjut',
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
      setMessage(`Contoh "${sample.name}" tidak bisa dibuka: ${parsed.error}`)
      return
    }
    const record = createProjectRecord(parsed.program.meta.name || sample.name)
    record.program = parsed.program
    const saved = await putProject(record)
    navigate(`/editor/${saved.id}`)
  }

  return (
    <section className="samples" aria-label="Contoh program">
      <header className="samples__head">
        <h2>
          <BookOpen size={16} aria-hidden="true" />
          Contoh program
        </h2>
        <p>Mulai dari flowchart yang sudah jalan, lalu ubah sesukamu.</p>
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
              aria-label={`Buka contoh ${sample.name}`}
              onClick={() => void open(sample)}
            >
              Buka contoh
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
