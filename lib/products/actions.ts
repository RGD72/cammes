'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

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

const IMAGE_SIGNED_URL_TTL_SECONDS = 3600

// products.image_crop_url stores a storage path (not a URL), since the
// `catalogs` bucket is private. RLS on the `products` table already decides
// who may see a given row; signing here just lets the browser load the
// image the row already grants access to — it never widens access.
async function attachSignedImageUrls(products: Product[]): Promise<Product[]> {
  const paths = [...new Set(products.map((p) => p.image_crop_url).filter((p): p is string => Boolean(p)))]
  if (paths.length === 0) return products

  const supabase = createServiceRoleSupabaseClient()
  const { data, error } = await supabase.storage
    .from('catalogs')
    .createSignedUrls(paths, IMAGE_SIGNED_URL_TTL_SECONDS)

  if (error || !data) return products

  const urlByPath = new Map(data.map((d) => [d.path, d.signedUrl] as const))

  return products.map((p) => ({
    ...p,
    image_crop_url: p.image_crop_url ? urlByPath.get(p.image_crop_url) ?? null : null,
  }))
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
  return attachSignedImageUrls((data ?? []) as Product[])
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
  return attachSignedImageUrls((data ?? []) as Product[])
}

export async function updateProduct(
  productId: string,
  brandId: string,
  data: Partial<Pick<Product, 'reference' | 'description' | 'price_brl' | 'look_group' | 'sizes' | 'colors'>>,
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

export async function deleteProduct(
  productId: string,
  brandId: string,
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }

  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('brand_id', brandId)
    .single()

  if (!existing) return { error: 'Produto não encontrado ou acesso negado.' }

  // cart_items.product_id é ON DELETE RESTRICT — se o produto estiver em um
  // carrinho de cliente, o delete falha com FK violation (23503).
  const { error } = await supabase.from('products').delete().eq('id', productId)

  if (error) {
    if (error.code === '23503') {
      return {
        error:
          'Não é possível excluir: o produto está em um carrinho de cliente. Oculte-o em vez de excluir, ou aguarde a finalização do pedido.',
      }
    }
    return { error: `Erro ao excluir produto: ${error.message}` }
  }

  return { error: null }
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
