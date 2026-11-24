import { Upload } from 'lucide-react'

export function ImportButton({ onFile }: { onFile: (file: File) => void }) {
  return (
    <label className="button button--ghost">
      <Upload size={16} aria-hidden="true" />
      Import .fprg
      <input
        className="visually-hidden"
        type="file"
        aria-label="Import .fprg"
        accept=".fprg,application/xml,text/xml"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
    </label>
  )
}
