import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBrandBySlug } from '@/lib/brands/actions'
import { getCatalogByBrand } from '@/lib/catalogs/actions'
import { getApprovedProductsForStorefront } from '@/lib/products/actions'
import { BrandStorefrontView } from './brand-storefront-view'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) return { title: 'Marca não encontrada' }
  return { title: brand.name }
}

export default async function BrandStorefrontPage({ params }: Props) {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)

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
    />
  )
}
