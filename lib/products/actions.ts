'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface Product {
  id: string
  brand_id: string
  catalog_id: string
  extraction_job_id: string
  reference: string | null
  description: string | null
  sizes: string[] | null
  colors: string[] | null
  price_brl: number | null
  image_crop_url: string | null
  look_group: string | null
  source_page: number | null
  extraction_confidence: Record<string, number> | null
  status: 'extracted' | 'approved' | 'hidden'
  display_order: number | null
  created_at: string
  updated_at: string
}

export async function getProductsForReview(brandId: string): Promise<Product[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('brand_id', brandId)
    .order('extraction_confidence', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as Product[]
}

export async function getApprovedProductsForStorefront(brandId: string): Promise<Product[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('brand_id', brandId)
    .eq('status', 'approved')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as Product[]
}

export async function updateProduct(
  productId: string,
  brandId: string,
  data: Partial<Pick<Product, 'reference' | 'description' | 'price_brl' | 'look_group'>>,
): Promise<{ product: Product | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { product: null, error: 'Usuário não autenticado.' }

  const { data: existing } = await supabase
    .from('products')
    .select('id, brand_id')
    .eq('id', productId)
    .eq('brand_id', brandId)
    .single()

  if (!existing) return { product: null, error: 'Produto não encontrado ou acesso negado.' }

  const { data: updated, error } = await supabase
    .from('products')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select()
    .single()

  if (error) return { product: null, error: error.message }
  return { product: updated as Product, error: null }
}

export async function bulkUpdateProductStatus(
  productIds: string[],
  brandId: string,
  status: 'approved' | 'hidden',
): Promise<{ updated: number; error: string | null }> {
  if (productIds.length === 0) return { updated: 0, error: null }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { updated: 0, error: 'Usuário não autenticado.' }

  const { data: owned, error: checkError } = await supabase
    .from('products')
    .select('id')
    .in('id', productIds)
    .eq('brand_id', brandId)

  if (checkError) return { updated: 0, error: checkError.message }
  if (!owned || owned.length !== productIds.length) {
    return { updated: 0, error: 'Um ou mais produtos não pertencem à marca ou não foram encontrados.' }
  }

  const { error } = await supabase
    .from('products')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', productIds)
    .eq('brand_id', brandId)

  if (error) return { updated: 0, error: error.message }
  return { updated: productIds.length, error: null }
}

export async function updateProductsOrder(
  orderedIds: string[],
  brandId: string,
): Promise<{ updated: number; error: string | null }> {
  if (orderedIds.length === 0) return { updated: 0, error: null }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { updated: 0, error: 'Usuário não autenticado.' }

  const { data: owned, error: checkError } = await supabase
    .from('products')
    .select('id')
    .in('id', orderedIds)
    .eq('brand_id', brandId)

  if (checkError) return { updated: 0, error: checkError.message }
  if (!owned || owned.length !== orderedIds.length) {
    return { updated: 0, error: 'Alguns produtos não pertencem à marca ou não foram encontrados.' }
  }

  const now = new Date().toISOString()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('products')
        .update({ display_order: index, updated_at: now })
        .eq('id', id)
        .eq('brand_id', brandId),
    ),
  )

  return { updated: orderedIds.length, error: null }
}
