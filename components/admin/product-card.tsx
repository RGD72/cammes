'use client'

import { useState, useTransition } from 'react'
import { updateProduct, deleteProduct } from '@/lib/products/actions'
import { TagListEditor } from '@/components/admin/tag-list-editor'
import { formatPriceBRL, formatPriceInputBRL, parsePriceInputBRL } from '@/lib/format/currency'
import type { Product } from '@/lib/products/actions'

function getConfidenceLevel(
  confidence: Record<string, number> | null,
): 'high' | 'medium' | 'low' | null {
  if (!confidence) return null
  const values = Object.values(confidence).filter((v) => typeof v === 'number')
  if (values.length === 0) return null
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  if (avg >= 0.8) return 'high'
  if (avg >= 0.5) return 'medium'
  return 'low'
}

const CONFIDENCE_BADGE: Record<'high' | 'medium' | 'low', { label: string; className: string }> = {
  high: { label: 'Alta', className: 'bg-green-100 text-green-700' },
  medium: { label: 'Média', className: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Baixa', className: 'bg-red-100 text-red-700' },
}

interface InlineFieldProps {
  value: string
  displayValue?: string
  multiline?: boolean
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  onSave: (v: string) => Promise<void>
}

function InlineField({ value, displayValue, multiline, inputProps, onSave }: InlineFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    if (draft === value) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      await onSave(draft)
      setEditing(false)
    })
  }

  if (editing) {
    const commonProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: handleConfirm,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) handleConfirm()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      },
      autoFocus: true,
      disabled: isPending,
      className:
        'w-full rounded border border-primary px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50',
    }
    return multiline ? (
      <textarea {...commonProps} rows={3} />
    ) : (
      <input {...commonProps} {...inputProps} />
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => { setDraft(value); setEditing(true) }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setDraft(value); setEditing(true) } }}
      className="cursor-pointer rounded px-1 hover:bg-muted text-sm"
    >
      {displayValue ?? (value || <span className="text-foreground/30 italic">—</span>)}
    </span>
  )
}

const NEW_LOOK_OPTION = '__new__'

interface LookFieldProps {
  value: string
  availableLooks: string[]
  onSave: (v: string) => Promise<void>
}

function LookField({ value, availableLooks, onSave }: LookFieldProps) {
  const [editing, setEditing] = useState(false)
  const [creatingNew, setCreatingNew] = useState(false)
  const [draft, setDraft] = useState(value)
  const [isPending, startTransition] = useTransition()

  function commit(next: string) {
    if (next === value) {
      setEditing(false)
      setCreatingNew(false)
      return
    }
    startTransition(async () => {
      await onSave(next)
      setEditing(false)
      setCreatingNew(false)
    })
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
    setCreatingNew(false)
  }

  if (editing && creatingNew) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft.trim())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft.trim())
          if (e.key === 'Escape') cancel()
        }}
        autoFocus
        disabled={isPending}
        placeholder="Nome do novo LOOK…"
        className="w-full rounded border border-primary px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      />
    )
  }

  if (editing) {
    return (
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === NEW_LOOK_OPTION) {
            setDraft('')
            setCreatingNew(true)
            return
          }
          commit(e.target.value)
        }}
        onBlur={cancel}
        autoFocus
        disabled={isPending}
        className="w-full rounded border border-primary px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      >
        <option value="">— Sem LOOK —</option>
        {availableLooks.map((look) => (
          <option key={look} value={look}>
            {look}
          </option>
        ))}
        <option value={NEW_LOOK_OPTION}>+ Novo LOOK…</option>
      </select>
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditing(true) }}
      className="inline-flex items-center gap-1 cursor-pointer rounded px-1 hover:bg-muted text-sm"
    >
      {value || <span className="text-foreground/30 italic">—</span>}
      <span className="text-foreground/30 text-xs" aria-hidden>▾</span>
    </span>
  )
}

interface ProductCardProps {
  product: Product
  selected: boolean
  availableLooks: string[]
  onToggleSelect: () => void
  onProductUpdate: (updated: Product) => void
  onProductDelete?: (productId: string) => void
  onError: (msg: string) => void
  onSuccess?: (msg: string) => void
}

export function ProductCard({
  product,
  selected,
  availableLooks,
  onToggleSelect,
  onProductUpdate,
  onProductDelete,
  onError,
  onSuccess,
}: ProductCardProps) {
  const [localProduct, setLocalProduct] = useState(product)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const confidenceLevel = getConfidenceLevel(localProduct.extraction_confidence)

  async function handleSave(
    field: 'reference' | 'description' | 'price_brl' | 'look_group',
    rawValue: string,
  ) {
    const previous = localProduct

    let value: string | number | null = rawValue
    if (field === 'price_brl') {
      value = parsePriceInputBRL(rawValue)
    } else if (field === 'look_group') {
      value = rawValue.trim() || null
    }

    const optimistic = { ...localProduct, [field]: value }
    setLocalProduct(optimistic)
    onProductUpdate(optimistic)

    const result = await updateProduct(localProduct.id, localProduct.brand_id, {
      [field]: value,
    } as Parameters<typeof updateProduct>[2])

    if (result.error) {
      setLocalProduct(previous)
      onProductUpdate(previous)
      onError(result.error)
    } else if (result.product) {
      // updateProduct() returns the raw storage path, not the signed URL we
      // originally received — keep the signed one so the image keeps loading.
      const merged = { ...result.product, image_crop_url: previous.image_crop_url }
      setLocalProduct(merged)
      onProductUpdate(merged)
      if (field === 'look_group') onSuccess?.('LOOK atualizado')
    }
  }

  async function handleSaveTags(field: 'sizes' | 'colors', values: string[]) {
    const previous = localProduct
    const optimistic = { ...localProduct, [field]: values }
    setLocalProduct(optimistic)
    onProductUpdate(optimistic)

    const result = await updateProduct(localProduct.id, localProduct.brand_id, {
      [field]: values,
    })

    if (result.error) {
      setLocalProduct(previous)
      onProductUpdate(previous)
      onError(result.error)
    } else if (result.product) {
      const merged = { ...result.product, image_crop_url: previous.image_crop_url }
      setLocalProduct(merged)
      onProductUpdate(merged)
    }
  }

  function handleConfirmDelete() {
    startDeleteTransition(async () => {
      const result = await deleteProduct(localProduct.id, localProduct.brand_id)
      if (result.error) {
        onError(result.error)
        setConfirmingDelete(false)
        return
      }
      onProductDelete?.(localProduct.id)
      onSuccess?.('Produto excluído')
    })
  }

  return (
    <div
      className={`relative flex flex-col rounded-lg border bg-card shadow-sm transition-colors ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-border'
      }`}
    >
      <label className="absolute top-2 left-2 z-10 cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded accent-primary"
        />
      </label>

      <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-muted">
        {localProduct.image_crop_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={localProduct.image_crop_url}
            alt={localProduct.reference ?? 'Produto'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/50 mb-0.5">Referência</p>
            <InlineField
              value={localProduct.reference ?? ''}
              onSave={(v) => handleSave('reference', v)}
            />
          </div>
          {confidenceLevel && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_BADGE[confidenceLevel].className}`}
            >
              {CONFIDENCE_BADGE[confidenceLevel].label}
            </span>
          )}
        </div>

        <div>
          <p className="text-xs text-foreground/50 mb-0.5">Descrição</p>
          <InlineField
            value={localProduct.description ?? ''}
            multiline
            onSave={(v) => handleSave('description', v)}
          />
        </div>

        <div>
          <p className="text-xs text-foreground/50 mb-0.5">Preço</p>
          <InlineField
            value={localProduct.price_brl != null ? formatPriceInputBRL(localProduct.price_brl) : ''}
            displayValue={localProduct.price_brl != null ? formatPriceBRL(localProduct.price_brl) : undefined}
            inputProps={{ inputMode: 'decimal', placeholder: '0,00' }}
            onSave={(v) => handleSave('price_brl', v)}
          />
        </div>

        <TagListEditor
          label="Tamanhos"
          values={localProduct.sizes ?? []}
          onChange={(next) => handleSaveTags('sizes', next)}
          placeholder="Ex: P, M, G…"
        />

        <TagListEditor
          label="Cores"
          values={localProduct.colors ?? []}
          onChange={(next) => handleSaveTags('colors', next)}
          placeholder="Ex: Preto, Branco…"
        />

        <div>
          <p className="text-xs text-foreground/50 mb-0.5">LOOK</p>
          <LookField
            value={localProduct.look_group ?? ''}
            availableLooks={availableLooks}
            onSave={(v) => handleSave('look_group', v)}
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              localProduct.status === 'approved'
                ? 'bg-green-100 text-green-700'
                : localProduct.status === 'hidden'
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-blue-100 text-blue-700'
            }`}
          >
            {localProduct.status === 'approved'
              ? 'Aprovado'
              : localProduct.status === 'hidden'
                ? 'Oculto'
                : 'Extraído'}
          </span>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">Excluir produto</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {localProduct.reference || localProduct.description || 'Este produto'} será removido
              permanentemente, incluindo da vitrine se estiver aprovado. Esta ação não pode ser
              desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
