'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProductCard } from '@/components/admin/product-card'
import { ProductReviewFilters } from '@/components/admin/product-review-filters'
import type { ReviewFilters } from '@/components/admin/product-review-filters'
import { bulkUpdateProductStatus } from '@/lib/products/actions'
import { retriggerExtraction } from '@/lib/catalogs/retrigger-actions'
import type { Product } from '@/lib/products/actions'

function getConfidenceAvg(confidence: Record<string, number> | null): number {
  if (!confidence) return Infinity
  const values = Object.values(confidence).filter((v) => typeof v === 'number')
  if (values.length === 0) return Infinity
  return values.reduce((a, b) => a + b, 0) / values.length
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
  const [toast, setToast] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function showError(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const lookOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const p of products) {
      if (p.look_group) seen.add(p.look_group)
    }
    return Array.from(seen).sort()
  }, [products])

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
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={selectedIds.has(product.id)}
              onToggleSelect={() => handleToggleSelect(product.id)}
              onProductUpdate={handleProductUpdate}
              onError={showError}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
          <p className="text-sm text-red-700">{toast}</p>
        </div>
      )}
    </div>
  )
}
