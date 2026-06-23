'use client'

import { useState } from 'react'

interface Props {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export function TagListEditor({ label, values, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('')

  function addTag() {
    const value = draft.trim()
    if (!value || values.includes(value)) {
      setDraft('')
      return
    }
    onChange([...values, value])
    setDraft('')
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag))
  }

  return (
    <div>
      <p className="text-xs text-foreground/50 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {values.length === 0 && <span className="text-xs italic text-foreground/30">Nenhum</span>}
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground/70"
          >
            {v}
            <button
              type="button"
              onClick={() => removeTag(v)}
              aria-label={`Remover ${v}`}
              className="leading-none text-foreground/40 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 rounded border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={addTag}
          className="shrink-0 rounded border px-2 py-1 text-xs hover:bg-muted"
        >
          + Add
        </button>
      </div>
    </div>
  )
}
