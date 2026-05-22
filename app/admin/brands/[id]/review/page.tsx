import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getBrand } from '@/lib/brands/actions'
import { getCatalogByBrand } from '@/lib/catalogs/actions'
import { getProductsForReview } from '@/lib/products/actions'
import { ProductReviewView } from '@/components/admin/product-review-view'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductReviewPage({ params }: Props) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [brand, catalog] = await Promise.all([getBrand(id), getCatalogByBrand(id)])

  if (!brand) notFound()

  if (!catalog || catalog.status !== 'ready_for_review') {
    redirect(`/admin/brands/${id}`)
  }

  const products = await getProductsForReview(id)

  return (
    <ProductReviewView
      brandId={id}
      catalogId={catalog.id}
      initialProducts={products}
    />
  )
}
