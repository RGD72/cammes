'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ProductCard } from '@/components/admin/product-card'
import { ProductReviewFilters } from '@/components/admin/product-review-filters'
import type { ReviewFilters } from '@/components/admin/product-review-filters'
import { bulkUpdateProductStatus, updateProductsOrder } from '@/lib/products/actions'
import { retriggerExtraction } from '@/lib/catalogs/retrigger-actions'
import type { Product } from '@/lib/products/actions'

function getConfidenceAvg(confidence: Record<string, number> | null): number {
  if (!confidence) return Infinity
  const values = Object.values(confidence).filter((v) => typeof v === 'number')
  if (values.length === 0) return Infinity
  return values.reduce((a, b) => a + b, 0) / values.length
}

interface SortableProductCardProps {
  product: Product
  selected: boolean
  availableLooks: string[]
  onToggleSelect: () => void
  onProductUpdate: (updated: Product) => void
  onProductDelete: (productId: string) => void
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

function SortableProductCard({
  product,
  selected,
  availableLooks,
  onToggleSelect,
  onProductUpdate,
  onProductDelete,
  onError,
  onSuccess,
}: SortableProductCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProductCard
        product={product}
        selected={selected}
        availableLooks={availableLooks}
        onToggleSelect={onToggleSelect}
        onProductUpdate={onProductUpdate}
        onProductDelete={onProductDelete}
        onError={onError}
        onSuccess={onSuccess}
      />
    </div>
  )
}

interface Props {
  brandId: string
  catalogId: string
  initialProducts: Product[]
}

export function ProductReviewView({ brandId, catalogId, initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<ReviewFilters>({
    searchText: '',
    filterLook: '',
    filterStatus: 'all',
  })
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat')
  const [activeId, setActiveId] = useState<string | null>(null)
  const router = useRouter()

  const currentOrderRef = useRef<Product[]>(products)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function showError(msg: string) {
    setToast({ msg, type: 'error' })
    setTimeout(() => setToast(null), 4000)
  }

  function showSuccess(msg: string) {
    setToast({ msg, type: 'success' })
    setTimeout(() => setToast(null), 3000)
  }

  const availableLooks = useMemo(() => {
    const seen = new Set<string>()
    for (const p of products) {
      if (p.look_group) seen.add(p.look_group)
    }
    return Array.from(seen).sort()
  }, [products])

  const lookOptions = availableLooks

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (
          filters.searchText &&
          !p.reference?.toLowerCase().includes(filters.searchText) &&
          !p.description?.toLowerCase().includes(filters.searchText)
        )
          return false
        if (filters.filterLook && p.look_group !== filters.filterLook) return false
        if (filters.filterStatus !== 'all' && p.status !== filters.filterStatus) return false
        return true
      })
      .sort((a, b) => getConfidenceAvg(a.extraction_confidence) - getConfidenceAvg(b.extraction_confidence))
  }, [products, filters])

  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of filteredProducts) {
      const key = p.look_group ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [filteredProducts])

  const approvedCount = products.filter((p) => p.status === 'approved').length
  const extractedCount = products.filter((p) => p.status === 'extracted').length
  const reviewComplete = extractedCount === 0 && products.length > 0

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleProductUpdate(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  function handleProductDelete(productId: string) {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    setSelectedIds((prev) => {
      if (!prev.has(productId)) return prev
      const next = new Set(prev)
      next.delete(productId)
      return next
    })
  }

  function handleBulkAction(status: 'approved' | 'hidden') {
    const ids = Array.from(selectedIds)
    startTransition(async () => {
      const result = await bulkUpdateProductStatus(ids, brandId, status)
      if (result.error) {
        showError(result.error)
        return
      }
      setProducts((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, status } : p)),
      )
      setSelectedIds(new Set())
    })
  }

  function handleRetrigger() {
    startTransition(async () => {
      const result = await retriggerExtraction(catalogId, brandId)
      if (result.error || !result.jobId) {
        showError(result.error ?? 'Erro ao iniciar re-extração.')
        return
      }
      router.push(`/admin/brands/${brandId}/extraction/${result.jobId}`)
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    setProducts((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id)
      const newIndex = prev.findIndex((p) => p.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      currentOrderRef.current = reordered
      return reordered
    })

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const result = await updateProductsOrder(
        currentOrderRef.current.map((p) => p.id),
        brandId,
      )
      if (result.error) showError(result.error)
      else showSuccess('Ordem salva')
    }, 300)
  }

  const activeProduct = activeId ? products.find((p) => p.id === activeId) : null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Revisão de produtos</h1>
          <p className="text-sm text-foreground/50 mt-0.5">
            {approvedCount} aprovados / {products.length} total
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === 'flat' ? 'grouped' : 'flat'))}
            className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'grouped' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {viewMode === 'grouped' ? 'Vista em grid' : 'Agrupar por LOOK'}
          </button>
          <button
            type="button"
            onClick={() => {
              const allVisibleIds = new Set(filteredProducts.map((p) => p.id))
              const allSelected =
                filteredProducts.length > 0 &&
                filteredProducts.every((p) => selectedIds.has(p.id))
              setSelectedIds(allSelected ? new Set() : allVisibleIds)
            }}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id))
              ? 'Desmarcar todos'
              : 'Selecionar todos'}
          </button>
          <button
            type="button"
            onClick={handleRetrigger}
            disabled={isPending}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {isPending ? 'Aguarde…' : 'Reprocessar catálogo'}
          </button>
          <Link
            href={`/admin/brands/${brandId}`}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            ← Voltar para a marca
          </Link>
        </div>
      </div>

      {reviewComplete && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-medium text-green-800">
            Revisão completa — todos os produtos foram classificados
          </p>
          <Link
            href={`/admin/brands/${brandId}`}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Ir para publicação →
          </Link>
        </div>
      )}

      <ProductReviewFilters
        filters={filters}
        lookOptions={lookOptions}
        onChange={setFilters}
      />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3 flex-wrap">
          <span className="text-sm text-foreground/70">
            {selectedIds.size} produto{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={() => handleBulkAction('approved')}
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Aprovar selecionados
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('hidden')}
            disabled={isPending}
            className="rounded-md bg-gray-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
          >
            Ocultar selecionados
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-foreground/50 hover:text-foreground"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/40">
          Nenhum produto encontrado com os filtros aplicados.
        </p>
      ) : viewMode === 'flat' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={filteredProducts.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <SortableProductCard
                  key={product.id}
                  product={product}
                  selected={selectedIds.has(product.id)}
                  availableLooks={availableLooks}
                  onToggleSelect={() => handleToggleSelect(product.id)}
                  onProductUpdate={handleProductUpdate}
                  onProductDelete={handleProductDelete}
                  onError={showError}
                  onSuccess={showSuccess}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeProduct ? (
              <div className="opacity-90 shadow-2xl rotate-1 scale-105">
                <ProductCard
                  product={activeProduct}
                  selected={selectedIds.has(activeProduct.id)}
                  availableLooks={availableLooks}
                  onToggleSelect={() => {}}
                  onProductUpdate={() => {}}
                  onError={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedProducts.entries())
            .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
            .map(([look, items]) => (
              <details key={look || '__no-look__'} open>
                <summary className="cursor-pointer select-none rounded-lg border bg-muted/30 px-4 py-2 text-sm font-medium hover:bg-muted">
                  {look || 'Sem LOOK'}{' '}
                  <span className="text-foreground/50">({items.length} produto{items.length !== 1 ? 's' : ''})</span>
                </summary>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mt-3">
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      selected={selectedIds.has(product.id)}
                      availableLooks={availableLooks}
                      onToggleSelect={() => handleToggleSelect(product.id)}
                      onProductUpdate={handleProductUpdate}
                      onProductDelete={handleProductDelete}
                      onError={showError}
                      onSuccess={showSuccess}
                    />
                  ))}
                </div>
              </details>
            ))}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 shadow-lg ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <p className={`text-sm ${toast.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {toast.msg}
          </p>
        </div>
      )}
    </div>
  )
}
