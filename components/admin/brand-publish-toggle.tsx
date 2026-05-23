'use client'

import { useRef, useState, useTransition } from 'react'
import { toggleBrandPublished } from '@/lib/brands/actions'
import type { Brand } from '@/lib/brands/actions'

interface Props {
  brandId: string
  initialPublished: boolean
  approvedCount: number
  extractedCount: number
  onToggle?: (brand: Brand) => void
}

export function BrandPublishToggle({
  brandId,
  initialPublished,
  approvedCount,
  extractedCount,
  onToggle,
}: Props) {
  const [published, setPublished] = useState(initialPublished)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isPending, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const canPublish = !published && approvedCount > 0 && extractedCount === 0

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  function handlePublishClick() {
    dialogRef.current?.showModal()
  }

  function handleCancelModal() {
    dialogRef.current?.close()
  }

  function handleConfirmPublish() {
    dialogRef.current?.close()
    startTransition(async () => {
      const result = await toggleBrandPublished(brandId, true)
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      setPublished(true)
      showToast('Vitrine publicada com sucesso.', 'success')
      if (result.brand) onToggle?.(result.brand)
    })
  }

  function handleUnpublish() {
    startTransition(async () => {
      const result = await toggleBrandPublished(brandId, false)
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      setPublished(false)
      showToast('Vitrine despublicada.', 'success')
      if (result.brand) onToggle?.(result.brand)
    })
  }

  let disabledReason: string | null = null
  if (!published) {
    if (extractedCount > 0) {
      disabledReason = 'Conclua a revisão dos produtos extraídos antes de publicar.'
    } else if (approvedCount === 0) {
      disabledReason = 'Aprove ao menos 1 produto antes de publicar.'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Status da vitrine:</span>
        {published ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Publicado
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Não publicado
          </span>
        )}
      </div>

      {!published ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handlePublishClick}
            disabled={!canPublish || isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Publicando…' : 'Publicar vitrine'}
          </button>
          {disabledReason && (
            <p className="text-xs text-foreground/60">{disabledReason}</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleUnpublish}
          disabled={isPending}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Despublicando…' : 'Despublicar vitrine'}
        </button>
      )}

      <dialog
        ref={dialogRef}
        className="rounded-lg p-6 shadow-lg backdrop:bg-black/40 max-w-sm w-full"
      >
        <h3 className="text-base font-semibold mb-2">Publicar vitrine?</h3>
        <p className="text-sm text-foreground/70 mb-6">
          Ao confirmar, os clientes com acesso passarão a ver o catálogo desta marca. Esta ação
          pode ser revertida a qualquer momento despublicando a vitrine.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancelModal}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmPublish}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Confirmar publicação
          </button>
        </div>
      </dialog>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
