'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/log-event'

export interface Catalog {
  id: string
  brand_id: string
  file_path: string
  page_count: number | null
  status: 'pending' | 'awaiting_extraction' | 'processing' | 'ready_for_review' | 'published'
  uploaded_at: string
  uploaded_by: string
}

export interface CatalogActionResult {
  catalog: Catalog | null
  error: string | null
}

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number
}

const UPLOAD_RATE_LIMIT = 3

export async function createCatalogRecord(data: {
  brandId: string
  filePath: string
}): Promise<CatalogActionResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { catalog: null, error: 'Usuário não autenticado.' }

  const { data: catalog, error } = await supabase
    .from('catalogs')
    .insert({
      brand_id: data.brandId,
      file_path: data.filePath,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) return { catalog: null, error: `Erro ao registrar catálogo: ${error.message}` }
  return { catalog: catalog as Catalog, error: null }
}

export async function getCatalogByBrand(brandId: string): Promise<Catalog | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('catalogs')
    .select('*')
    .eq('brand_id', brandId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as Catalog
}

export async function getCatalogSignedUrl(
  catalogId: string,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { url: null, error: 'Usuário não autenticado.' }

  const { data: catalog, error: catError } = await supabase
    .from('catalogs')
    .select('file_path')
    .eq('id', catalogId)
    .single()

  if (catError || !catalog) return { url: null, error: 'Catálogo não encontrado.' }

  const { data: signedData, error: signError } = await supabase.storage
    .from('catalogs')
    .createSignedUrl(catalog.file_path, 300)

  if (signError || !signedData) return { url: null, error: 'Erro ao gerar link de download.' }

  return { url: signedData.signedUrl, error: null }
}

export async function deleteCatalog(
  catalogId: string,
  brandId: string,
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, published')
    .eq('id', brandId)
    .eq('owner_admin_id', user.id)
    .single()
  if (!brand) return { error: 'Marca não encontrada ou acesso negado.' }

  const { data: catalog } = await supabase
    .from('catalogs')
    .select('id, file_path')
    .eq('id', catalogId)
    .eq('brand_id', brandId)
    .single()
  if (!catalog) return { error: 'Catálogo não encontrado.' }

  // CASCADE remove extraction_jobs e products vinculados. Se algum produto
  // estiver em carrinho/pedido de cliente (cart_items/order_items ON DELETE
  // RESTRICT), o delete falha com FK violation (23503) e nada é apagado.
  const { error: deleteError } = await supabase
    .from('catalogs')
    .delete()
    .eq('id', catalogId)

  if (deleteError) {
    if (deleteError.code === '23503') {
      return {
        error:
          'Não é possível excluir: existem produtos deste catálogo em carrinhos ou pedidos de clientes.',
      }
    }
    return { error: `Erro ao excluir catálogo: ${deleteError.message}` }
  }

  await supabase.storage.from('catalogs').remove([catalog.file_path])

  if (brand.published) {
    await supabase
      .from('brands')
      .update({ published: false, published_at: null, updated_at: new Date().toISOString() })
      .eq('id', brandId)
  }

  await logAuditEvent('catalog_deleted', { catalogId, brandId, adminId: user.id })

  return { error: null }
}

export async function checkUploadRateLimit(): Promise<RateLimitResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { allowed: false, count: 0, limit: UPLOAD_RATE_LIMIT }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('catalogs')
    .select('id', { count: 'exact', head: true })
    .eq('uploaded_by', user.id)
    .gte('uploaded_at', oneHourAgo)

  if (error) return { allowed: true, count: 0, limit: UPLOAD_RATE_LIMIT }

  const uploads = count ?? 0
  return {
    allowed: uploads < UPLOAD_RATE_LIMIT,
    count: uploads,
    limit: UPLOAD_RATE_LIMIT,
  }
}
