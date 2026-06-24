'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { CatalogUploadZone } from '@/components/admin/catalog-upload-zone'
import { ExtractionEstimateCard } from '@/components/admin/extraction-estimate-card'
import { BrandPublishToggle } from '@/components/admin/brand-publish-toggle'
import { DeleteCatalogButton } from '@/components/admin/delete-catalog-button'
import { DeleteBrandButton } from '@/components/admin/delete-brand-button'
import { BrandNameEditor } from '@/components/admin/brand-name-editor'
import type { Brand } from '@/lib/brands/actions'
import type { Catalog } from '@/lib/catalogs/actions'

const STATUS_LABELS: Record<Catalog['status'], string> = {
  pending: 'Em processamento',
  awaiting_extraction: 'Aguardando extração',
  processing: 'Em processamento',
  ready_for_review: 'Pronto para revisão',
  published: 'Publicado',
}

interface Props {
  brand: Brand
  catalog: Catalog | null
  hasOpenRouterKey: boolean
  modelId: string
  activeJobId?: string
  failedJobId?: string
  approvedCount: number
  extractedCount: number
}

export function BrandDetailView({ brand, catalog: initialCatalog, hasOpenRouterKey, modelId, activeJobId, failedJobId, approvedCount, extractedCount }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(initialCatalog)
  const [published, setPublished] = useState(brand.published)
  const [brandName, setBrandName] = useState(brand.name)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCatalogDeleted() {
    setCatalog(null)
    setPublished(false)
  }

  function showError(msg: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast(msg)
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <BrandNameEditor
          brandId={brand.id}
          name={brandName}
          onUpdated={setBrandName}
          onError={showError}
        />
        <p className="text-sm text-foreground/50 font-mono">/{brand.slug}</p>
        {brand.description && (
          <p className="mt-2 text-sm text-foreground/70">{brand.description}</p>
        )}
        {brand.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo_url}
            alt={`Logo de ${brandName}`}
            className="mt-3 h-12 w-auto object-contain"
          />
        )}
      </div>

      <div>
        <h2 className="text-base font-medium mb-3">Publicação da vitrine</h2>
        <div className="mb-3">
          <Link
            href={`/admin/brands/${brand.id}/preview`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Visualizar vitrine
            {!published && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                preview
              </span>
            )}
            <span aria-hidden>↗</span>
          </Link>
        </div>
        <BrandPublishToggle
          key={String(published)}
          brandId={brand.id}
          initialPublished={published}
          approvedCount={approvedCount}
          extractedCount={extractedCount}
        />
      </div>

      <div>
        <h2 className="text-base font-medium mb-3">Catálogo PDF</h2>

        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground/60">Status:</span>
            <span className="text-sm font-medium">
              {catalog ? STATUS_LABELS[catalog.status] : 'Nenhum catálogo'}
            </span>
          </div>
          {catalog && (
            <DeleteCatalogButton
              catalogId={catalog.id}
              brandId={brand.id}
              disabled={Boolean(activeJobId) || catalog.status === 'processing'}
              disabledReason="Aguarde a extração finalizar antes de excluir o catálogo."
              onDeleted={handleCatalogDeleted}
            />
          )}
        </div>

        {catalog?.file_path && (
          <p className="mb-3 text-xs text-foreground/40 font-mono truncate">
            {catalog.file_path}
          </p>
        )}

        {catalog?.status === 'ready_for_review' && (
          <div className="mb-6">
            <Link
              href={`/admin/brands/${brand.id}/review`}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Revisar produtos →
            </Link>
          </div>
        )}

        {(activeJobId || catalog?.status === 'processing') && (
          <div className="mb-6">
            <Link
              href={`/admin/brands/${brand.id}/extraction/${activeJobId ?? ''}`}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Extração em andamento — Ver progresso →
            </Link>
          </div>
        )}

        {failedJobId && (
          <div className="mb-6 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <span className="text-red-600 text-sm font-medium">⚠ A última extração falhou.</span>
            <Link
              href={`/admin/brands/${brand.id}/extraction/${failedJobId}`}
              className="text-sm text-red-700 underline hover:text-red-900"
            >
              Ver detalhes e tentar novamente →
            </Link>
          </div>
        )}

        {catalog?.status === 'awaiting_extraction' && !activeJobId && (
          <div className="mb-6">
            <ExtractionEstimateCard
              catalog={catalog}
              hasOpenRouterKey={hasOpenRouterKey}
              modelId={modelId}
            />
          </div>
        )}

        {catalog ? (
          <p className="text-xs text-foreground/50">
            Exclua o catálogo atual para liberar o upload de um novo PDF.
          </p>
        ) : (
          <CatalogUploadZone
            brandId={brand.id}
            onUploadComplete={(newCatalog) => setCatalog(newCatalog)}
          />
        )}
      </div>

      <div className="border-t pt-6">
        <h2 className="text-base font-medium mb-3 text-red-700">Zona de perigo</h2>
        <DeleteBrandButton brandId={brand.id} brandName={brandName} published={published} />
      </div>

      {toast && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-lg"
        >
          <p className="text-sm text-red-700">{toast}</p>
        </div>
      )}
    </div>
  )
}
