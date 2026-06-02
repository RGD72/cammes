'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { ProductGridCard } from '@/components/brands/product-grid-card'
import { SelectProductModal } from '@/components/brands/select-product-modal'
import { getCatalogSignedUrl } from '@/lib/catalogs/actions'
import type { Brand } from '@/lib/brands/actions'
import type { Product } from '@/lib/products/actions'

interface Props {
  brand: Brand
  products: Product[]
  catalogId: string | null
  isPreview?: boolean
}

export function BrandStorefrontView({ brand, products, catalogId, isPreview = false }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedLooks, setSelectedLooks] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [isPdfPending, startPdfTransition] = useTransition()
  const [modalProduct, setModalProduct] = useState<Product | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const availableLooks = useMemo(
    () => [...new Set(products.map((p) => p.look_group).filter(Boolean))] as string[],
    [products],
  )

  const availableSizes = useMemo(
    () => [...new Set(products.flatMap((p) => p.sizes ?? []))].sort(),
    [products],
  )

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        const matchRef = p.reference?.toLowerCase().includes(q) ?? false
        const matchDesc = p.description?.toLowerCase().includes(q) ?? false
        if (!matchRef && !matchDesc) return false
      }
      if (selectedLooks.length > 0 && !selectedLooks.includes(p.look_group ?? '')) return false
      if (selectedSizes.length > 0 && !selectedSizes.some((s) => p.sizes?.includes(s))) return false
      return true
    })
  }, [products, debouncedSearch, selectedLooks, selectedSizes])

  const hasActiveFilters = debouncedSearch || selectedLooks.length > 0 || selectedSizes.length > 0

  function toggleLook(look: string) {
    setSelectedLooks((prev) =>
      prev.includes(look) ? prev.filter((l) => l !== look) : [...prev, look],
    )
  }

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    )
  }

  function handlePdfDownload() {
    if (!catalogId) return
    startPdfTransition(async () => {
      const { url, error } = await getCatalogSignedUrl(catalogId)
      if (url) {
        window.open(url, '_blank')
      } else {
        alert(error ?? 'Erro ao gerar link de download.')
      }
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {isPreview && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 text-lg" aria-hidden>⚠</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Modo preview — vitrine não publicada</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Somente você (admin) está vendo esta página. Clientes não têm acesso enquanto a vitrine não for publicada.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {brand.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logo_url}
              alt={`Logo de ${brand.name}`}
              className="h-10 w-auto object-contain mb-2"
            />
          )}
          <h1 className="text-2xl font-bold">{brand.name}</h1>
          {brand.description && (
            <p className="text-sm text-foreground/60 mt-1">{brand.description}</p>
          )}
        </div>
        {catalogId && (
          <button
            onClick={handlePdfDownload}
            disabled={isPdfPending}
            aria-busy={isPdfPending}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {isPdfPending ? 'Gerando link…' : 'Baixar catálogo PDF'}
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <input
          type="search"
          aria-label="Buscar produtos"
          placeholder="Buscar por referência ou descrição…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="flex flex-wrap gap-4">
          {availableLooks.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-foreground/50 font-medium">LOOK:</span>
              {availableLooks.map((look) => (
                <button
                  key={look}
                  onClick={() => toggleLook(look)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedLooks.includes(look)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                >
                  {look}
                </button>
              ))}
            </div>
          )}

          {availableSizes.length > 0 && (
            <fieldset className="flex flex-wrap gap-2 items-center">
              <legend className="text-xs text-foreground/50 font-medium">Tamanhos:</legend>
              {availableSizes.map((size) => (
                <label
                  key={size}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                    selectedSizes.includes(size)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedSizes.includes(size)}
                    onChange={() => toggleSize(size)}
                  />
                  {size}
                </label>
              ))}
            </fieldset>
          )}
        </div>
      </div>

      {/* Grid or Empty States */}
      {products.length === 0 ? (
        <div className="text-center py-16 text-foreground/40">
          <p className="text-lg">Esta vitrine não tem produtos ainda.</p>
        </div>
      ) : filteredProducts.length === 0 && hasActiveFilters ? (
        <div className="text-center py-16 text-foreground/40">
          <p className="text-lg">Nenhum produto encontrado.</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedLooks([])
              setSelectedSizes([])
            }}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductGridCard
              key={product.id}
              product={product}
              onSelect={setModalProduct}
            />
          ))}
        </div>
      )}

      {modalProduct && (
        <SelectProductModal
          product={modalProduct}
          brandId={brand.id}
          onClose={() => setModalProduct(null)}
        />
      )}
    </div>
  )
}
