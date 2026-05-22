'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

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
