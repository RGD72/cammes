'use client'

import { useState, useTransition } from 'react'
import { deleteCatalog } from '@/lib/catalogs/actions'

interface Props {
  catalogId: string
  brandId: string
  disabled?: boolean
  disabledReason?: string
  onDeleted: () => void
}

export function DeleteCatalogButton({ catalogId, brandId, disabled, disabledReason, onDeleted }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteCatalog(catalogId, brandId)
      if (result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
      onDeleted()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Excluir catálogo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-catalog-title"
        >
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 id="delete-catalog-title" className="text-lg font-semibold">
              Excluir catálogo
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Isso vai remover o PDF e <strong>todos os produtos extraídos</strong> dele, incluindo
              os já aprovados. Se a vitrine estava publicada, ela será despublicada automaticamente.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Excluindo…' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
