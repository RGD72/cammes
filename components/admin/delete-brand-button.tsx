'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteBrand } from '@/lib/brands/actions'

interface Props {
  brandId: string
  brandName: string
  published: boolean
}

export function DeleteBrandButton({ brandId, brandName, published }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const canConfirm = !published && confirmText.trim() === brandName

  function handleClose() {
    setOpen(false)
    setConfirmText('')
    setError(null)
  }

  function handleConfirm() {
    if (!canConfirm) return
    setError(null)
    startTransition(async () => {
      const result = await deleteBrand(brandId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/admin/brands')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Excluir marca
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-brand-title"
        >
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 id="delete-brand-title" className="text-lg font-semibold text-red-700">
              Excluir marca &ldquo;{brandName}&rdquo;
            </h2>

            {published ? (
              <p className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-700">
                Despublique a vitrine antes de excluir a marca.
              </p>
            ) : (
              <>
                <p className="mt-3 text-sm text-muted-foreground">
                  Isso vai apagar permanentemente o catálogo, todos os produtos e os acessos de
                  clientes vinculados a esta marca.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>

                <label htmlFor="confirm-brand-name" className="mt-4 block text-sm font-medium">
                  Digite <strong>{brandName}</strong> para confirmar:
                </label>
                <input
                  id="confirm-brand-name"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoFocus
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              {!published && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending || !canConfirm}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Excluindo…' : 'Excluir definitivamente'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
