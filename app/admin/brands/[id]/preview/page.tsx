import { notFound } from 'next/navigation'
import { getBrand } from '@/lib/brands/actions'
import { getCatalogByBrand } from '@/lib/catalogs/actions'
import { getApprovedProductsForStorefront } from '@/lib/products/actions'
import { BrandStorefrontView } from '@/app/brands/[slug]/brand-storefront-view'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BrandAdminPreviewPage({ params }: Props) {
  const { id } = await params
  const brand = await getBrand(id)

  if (!brand) notFound()

  const [catalog, products] = await Promise.all([
    getCatalogByBrand(brand.id),
    getApprovedProductsForStorefront(brand.id),
  ])

  return (
    <BrandStorefrontView
      brand={brand}
      products={products}
      catalogId={catalog?.id ?? null}
      isPreview
    />
  )
}
