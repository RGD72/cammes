'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface Catalog {
  id: string
  brand_id: string
  file_path: string
  page_count: number | null
  status: 'pending' | 'processing' | 'ready_for_review' | 'published'
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
