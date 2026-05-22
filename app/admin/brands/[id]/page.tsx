import { notFound } from 'next/navigation'
import { getBrand } from '@/lib/brands/actions'
import { getCatalogByBrand } from '@/lib/catalogs/actions'
import { getOpenRouterStatus } from '@/lib/admin/openrouter-settings'
import { BrandDetailView } from './brand-detail-view'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BrandDetailPage({ params }: Props) {
  const { id } = await params
  const [brand, catalog, openRouterStatus] = await Promise.all([
    getBrand(id),
    getCatalogByBrand(id),
    getOpenRouterStatus(),
  ])

  if (!brand) notFound()

  return (
    <BrandDetailView
      brand={brand}
      catalog={catalog}
      hasOpenRouterKey={openRouterStatus.hasKey}
      modelId={openRouterStatus.model}
    />
  )
}
