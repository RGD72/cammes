'use server'

import { revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/log-event'
import { removeCatalogPageImages } from '@/lib/catalogs/actions'

export interface Brand {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  published: boolean
  owner_admin_id: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface BrandActionResult {
  brand: Brand | null
  error: string | null
}

const SLUG_PATTERN = /^[a-z0-9-]+$/

export async function createBrand(data: {
  name: string
  slug: string
  description?: string
  logo_url?: string
}): Promise<BrandActionResult> {
  const slug = data.slug.trim()
  const name = data.name.trim()

  if (!name) return { brand: null, error: 'Nome da marca é obrigatório.' }
  if (!slug) return { brand: null, error: 'Slug é obrigatório.' }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      brand: null,
      error: 'Slug inválido — use apenas letras minúsculas, números e hífens.',
    }
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { brand: null, error: 'Usuário não autenticado.' }

  const { data: brand, error } = await supabase
    .from('brands')
    .insert({
      name,
      slug,
      description: data.description?.trim() || null,
      logo_url: data.logo_url?.trim() || null,
      owner_admin_id: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { brand: null, error: 'Slug já está em uso. Escolha um slug diferente.' }
    }
    return { brand: null, error: `Erro ao criar marca: ${error.message}` }
  }

  return { brand: brand as Brand, error: null }
}

export async function getBrand(id: string): Promise<Brand | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Brand
}

export async function listAdminBrands(): Promise<Brand[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as Brand[]
}

export interface BrandForCustomer {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  product_count: number
}

export async function getBrandsForCustomer(): Promise<BrandForCustomer[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('brands')
    .select('id, slug, name, description, logo_url, products(count)')
    .order('name', { ascending: true })
  if (error || !data) return []
  return data.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    logo_url: b.logo_url,
    product_count: (b.products as unknown as [{ count: number }])?.[0]?.count ?? 0,
  }))
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as Brand
}

export async function deleteBrand(brandId: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, published')
    .eq('id', brandId)
    .eq('owner_admin_id', user.id)
    .single()
  if (!brand) return { error: 'Marca não encontrada ou acesso negado.' }

  if (brand.published) {
    return { error: 'Despublique a vitrine antes de excluir a marca.' }
  }

  // Capturar paths dos arquivos de catálogo antes do CASCADE apagar as linhas
  const { data: catalogs } = await supabase
    .from('catalogs')
    .select('id, file_path')
    .eq('brand_id', brandId)

  // CASCADE remove catalogs, products, extraction_jobs e user_brand_access.
  // orders.brand_id é ON DELETE RESTRICT — se houver pedidos registrados,
  // o delete falha com FK violation (23503) e nada é apagado.
  const { error: deleteError } = await supabase.from('brands').delete().eq('id', brandId)

  if (deleteError) {
    if (deleteError.code === '23503') {
      return { error: 'Não é possível excluir: existem pedidos registrados para esta marca.' }
    }
    return { error: `Erro ao excluir marca: ${deleteError.message}` }
  }

  if (catalogs && catalogs.length > 0) {
    await supabase.storage.from('catalogs').remove(catalogs.map((c) => c.file_path))
    await Promise.all(catalogs.map((c) => removeCatalogPageImages(supabase, brandId, c.id)))
  }

  await logAuditEvent('brand_deleted', { brandId, brandName: brand.name, adminId: user.id })

  revalidateTag(`kpis:admin:${user.id}`)

  return { error: null }
}

export async function toggleBrandPublished(
  brandId: string,
  published: boolean,
): Promise<BrandActionResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { brand: null, error: 'Usuário não autenticado.' }

  const { data: existing } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('owner_admin_id', user.id)
    .single()

  if (!existing) return { brand: null, error: 'Marca não encontrada ou acesso negado.' }

  if (published) {
    const { count: extractedCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('status', 'extracted')

    if ((extractedCount ?? 0) > 0) {
      return { brand: null, error: 'Conclua a revisão dos produtos extraídos antes de publicar.' }
    }

    const { count: approvedCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('status', 'approved')

    if ((approvedCount ?? 0) === 0) {
      return { brand: null, error: 'Aprove ao menos 1 produto antes de publicar a vitrine.' }
    }
  }

  const { data: brand, error } = await supabase
    .from('brands')
    .update({
      published,
      published_at: published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandId)
    .eq('owner_admin_id', user.id)
    .select()
    .single()

  if (error) return { brand: null, error: error.message }

  await logAuditEvent(published ? 'brand_published' : 'brand_unpublished', {
    brandId,
    adminId: user.id,
  })

  revalidateTag(`kpis:admin:${user.id}`)

  return { brand: brand as Brand, error: null }
}
