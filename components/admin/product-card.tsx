'use client'

import { useState, useTransition } from 'react'
import { updateProduct } from '@/lib/products/actions'
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
  multiline?: boolean
  onSave: (v: string) => Promise<void>
}

function InlineField({ value, multiline, onSave }: InlineFieldProps) {
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
      <input {...commonProps} />
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
      {value || <span className="text-foreground/30 italic">—</span>}
    </span>
  )
}

interface ProductCardProps {
  product: Product
  selected: boolean
  onToggleSelect: () => void
  onProductUpdate: (updated: Product) => void
  onError: (msg: string) => void
}

export function ProductCard({
  product,
  selected,
  onToggleSelect,
  onProductUpdate,
  onError,
}: ProductCardProps) {
  const [localProduct, setLocalProduct] = useState(product)
  const confidenceLevel = getConfidenceLevel(localProduct.extraction_confidence)

  async function handleSave(
    field: 'reference' | 'description' | 'price_brl',
    rawValue: string,
  ) {
    const previous = localProduct

    let value: string | number | null = rawValue
    if (field === 'price_brl') {
      const parsed = parseFloat(rawValue.replace(',', '.'))
      value = isNaN(parsed) ? null : parsed
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
      setLocalProduct(result.product)
      onProductUpdate(result.product)
    }
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
            value={localProduct.price_brl != null ? String(localProduct.price_brl) : ''}
            onSave={(v) => handleSave('price_brl', v)}
          />
        </div>

        {localProduct.sizes && localProduct.sizes.length > 0 && (
          <div>
            <p className="text-xs text-foreground/50 mb-1">Tamanhos</p>
            <div className="flex flex-wrap gap-1">
              {localProduct.sizes.map((s) => (
                <span
                  key={s}
                  className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {localProduct.colors && localProduct.colors.length > 0 && (
          <div>
            <p className="text-xs text-foreground/50 mb-1">Cores</p>
            <div className="flex flex-wrap gap-1">
              {localProduct.colors.map((c) => (
                <span
                  key={c}
                  className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground/70"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-1">
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
        </div>
      </div>
    </div>
  )
}
