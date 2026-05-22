'use client'

import { useState } from 'react'
import { CatalogUploadZone } from '@/components/admin/catalog-upload-zone'
import { ExtractionEstimateCard } from '@/components/admin/extraction-estimate-card'
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
}

export function BrandDetailView({ brand, catalog: initialCatalog, hasOpenRouterKey, modelId }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(initialCatalog)

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{brand.name}</h1>
        <p className="text-sm text-foreground/50 font-mono">/{brand.slug}</p>
        {brand.description && (
          <p className="mt-2 text-sm text-foreground/70">{brand.description}</p>
        )}
        {brand.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo_url}
            alt={`Logo de ${brand.name}`}
            className="mt-3 h-12 w-auto object-contain"
          />
        )}
      </div>

      <div>
        <h2 className="text-base font-medium mb-3">Catálogo PDF</h2>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-foreground/60">Status:</span>
          <span className="text-sm font-medium">
            {catalog ? STATUS_LABELS[catalog.status] : 'Nenhum catálogo'}
          </span>
        </div>

        {catalog?.file_path && (
          <p className="mb-3 text-xs text-foreground/40 font-mono truncate">
            {catalog.file_path}
          </p>
        )}

        {catalog?.status === 'awaiting_extraction' && (
          <div className="mb-6">
            <ExtractionEstimateCard
              catalog={catalog}
              hasOpenRouterKey={hasOpenRouterKey}
              modelId={modelId}
            />
          </div>
        )}

        <CatalogUploadZone
          brandId={brand.id}
          onUploadComplete={(newCatalog) => setCatalog(newCatalog)}
        />
      </div>
    </div>
  )
}
