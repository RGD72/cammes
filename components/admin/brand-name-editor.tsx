'use client'

import { useEffect, useState, useTransition } from 'react'
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

  useEffect(() => {
    if (!editing) setDraft(name)
  }, [name, editing])

  function commit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) {
      setDraft(name)
      setEditing(false)
      return
    }
    startTransition(async () => {
      try {
        const result = await updateBrand(brandId, { name: trimmed })
        if (result.error) {
          onError(result.error)
        } else if (result.brand) {
          setDraft(result.brand.name)
          onUpdated(result.brand.name)
          setEditing(false)
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Erro ao atualizar marca.')
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!isPending) setEditing(true) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!isPending) setEditing(true)
        }
      }}
      className="inline-flex items-center gap-1.5 cursor-pointer rounded px-1 -mx-1 hover:bg-muted"
      title="Clique para editar o nome da marca"
    >
      <h1 className="text-xl font-semibold">{name}</h1>
      <span className="text-foreground/30 text-sm" aria-hidden>✎</span>
    </div>
  )
}
