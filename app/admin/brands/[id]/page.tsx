import { notFound } from 'next/navigation'
import { getBrand } from '@/lib/brands/actions'
import { getCatalogByBrand } from '@/lib/catalogs/actions'
import { BrandDetailView } from './brand-detail-view'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BrandDetailPage({ params }: Props) {
  const { id } = await params
  const [brand, catalog] = await Promise.all([getBrand(id), getCatalogByBrand(id)])

  if (!brand) notFound()

  return <BrandDetailView brand={brand} catalog={catalog} />
}
