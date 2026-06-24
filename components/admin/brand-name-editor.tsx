'use client'

import { useState, useTransition } from 'react'
import { updateBrand } from '@/lib/brands/actions'

interface Props {
  brandId: string
  name: string
  onUpdated: (name: string) => void
  onError: (msg: string) => void
}

export function BrandNameEditor({ brandId, name, onUpdated, onError }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [isPending, startTransition] = useTransition()

  function commit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) {
      setDraft(name)
      setEditing(false)
      return
    }
    startTransition(async () => {
      const result = await updateBrand(brandId, { name: trimmed })
      if (result.error) {
        onError(result.error)
      } else if (result.brand) {
        setDraft(result.brand.name)
        onUpdated(result.brand.name)
        setEditing(false)
      }
    })
  }

  function cancel() {
    setDraft(name)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') cancel()
        }}
        autoFocus
        disabled={isPending}
        className="text-xl font-semibold rounded border border-primary px-2 py-1 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      />
    )
  }

  return (
    <h1
      role="button"
      tabIndex={0}
      onClick={() => { if (!isPending) setEditing(true) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!isPending) setEditing(true)
        }
      }}
      className="inline-flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 text-xl font-semibold hover:bg-muted"
      title="Clique para editar o nome da marca"
    >
      {name}
      <span className="text-foreground/30 text-sm" aria-hidden>✎</span>
    </h1>
  )
}
