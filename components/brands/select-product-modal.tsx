'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { addItem } from '@/lib/carts/actions'
import type { Product } from '@/lib/products/actions'

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    const getFocusable = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))

    const first = getFocusable()[0]
    first?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) return
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === focusable[0]) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          focusable[0].focus()
        }
      }
    }

    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [active])

  return ref
}

interface Props {
  product: Product
  brandId: string
  brandSlug: string
  onClose: () => void
}

export function SelectProductModal({ product, brandId, brandSlug, onClose }: Props) {
  const colors = product.colors ?? []
  const sizes = product.sizes ?? []

  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] ?? null)
  const [selectedSize, setSelectedSize] = useState<string | null>(sizes[0] ?? null)
  const [quantity, setQuantity] = useState(1)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const dialogRef = useFocusTrap(true)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleAdd() {
    if (product.price_brl == null) return
    startTransition(async () => {
      const result = await addItem({
        brandId,
        productId: product.id,
        color: selectedColor,
        size: selectedSize,
        quantity,
        unitPriceBrl: product.price_brl!,
      })
      if (result.ok) {
        toast.success('Produto adicionado ao carrinho!', {
          action: {
            label: 'Ver carrinho',
            onClick: () => router.push(`/cart/${brandSlug}`),
          },
        })
        router.refresh()
        onClose()
      } else {
        toast.error(result.error.message)
      }
    })
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-background shadow-xl flex flex-col max-h-[90dvh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 rounded-full p-1.5 text-foreground/60 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5 flex flex-col gap-5">
          {/* Product info */}
          <div className="flex gap-4">
            {product.image_crop_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_crop_url}
                alt={product.reference ?? 'Produto'}
                className="h-24 w-24 rounded-lg object-contain border bg-muted shrink-0"
              />
            )}
            <div className="flex flex-col gap-1">
              <h2 id="modal-title" className="text-base font-semibold leading-tight">
                {product.reference ?? 'Produto'}
              </h2>
              {product.description && (
                <p className="text-sm text-foreground/60 line-clamp-3">{product.description}</p>
              )}
              {product.price_brl != null && (
                <p className="text-sm font-semibold mt-auto">
                  {priceFormatter.format(product.price_brl)}
                </p>
              )}
            </div>
          </div>

          {/* Colors */}
          {colors.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground/60 uppercase tracking-wide">
                Cor{selectedColor ? `: ${selectedColor}` : ''}
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Selecione a cor">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    aria-pressed={selectedColor === color}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                      selectedColor === color
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizes.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground/60 uppercase tracking-wide">
                Tamanho{selectedSize ? `: ${selectedSize}` : ''}
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Selecione o tamanho">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={selectedSize === size}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                      selectedSize === size
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground/60 uppercase tracking-wide">
              Quantidade
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="h-9 w-9 rounded-full border flex items-center justify-center text-lg font-semibold hover:bg-muted disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                disabled={quantity >= 99}
                className="h-9 w-9 rounded-full border flex items-center justify-center text-lg font-semibold hover:bg-muted disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                +
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || product.price_brl == null}
            aria-busy={isPending}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground tracking-widest uppercase hover:bg-primary/90 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            {isPending ? 'Adicionando…' : 'ESCOLHIDO'}
          </button>
        </div>
      </div>
    </div>
  )
}
