'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { decryptKey } from '@/lib/openrouter/crypto'
import type { StartExtractionResult } from './extraction-actions'

export async function retriggerExtraction(
  catalogId: string,
  brandId: string,
): Promise<StartExtractionResult> {
  const supabaseUser = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabaseUser.auth.getUser()
  if (!user) return { jobId: null, error: 'Usuário não autenticado.' }

  const adminId = user.id
  const supabase = createServiceRoleSupabaseClient()

  // Verify admin owns the brand (AC 1 — security gate)
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('owner_admin_id', adminId)
    .single()

  if (!brand) {
    return { jobId: null, error: 'Marca não encontrada ou acesso negado.' }
  }

  // Find most recent non-superseded job for this catalog
  const { data: oldJob } = await supabase
    .from('extraction_jobs')
    .select('id, pages_total, status')
    .eq('catalog_id', catalogId)
    .eq('brand_id', brandId)
    .neq('status', 'superseded')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!oldJob) {
    return { jobId: null, error: 'Nenhum job ativo encontrado para re-extração.' }
  }

  // Mark old job as superseded
  await supabase
    .from('extraction_jobs')
    .update({ status: 'superseded' })
    .eq('id', oldJob.id)

  // Delete only extracted products (preserve approved and hidden — AC 1)
  await supabase
    .from('products')
    .delete()
    .eq('extraction_job_id', oldJob.id)
    .eq('status', 'extracted')

  // Load OpenRouter settings
  const { data: settings } = await supabase
    .from('admin_settings')
    .select('openrouter_key_encrypted, openrouter_model')
    .eq('admin_user_id', adminId)
    .single()

  if (!settings?.openrouter_key_encrypted) {
    return { jobId: null, error: 'Chave OpenRouter não configurada.' }
  }

  let openrouterKey: string
  let modelId: string
  try {
    openrouterKey = await decryptKey(settings.openrouter_key_encrypted)
    modelId = settings.openrouter_model ?? 'google/gemini-2.5-flash'
  } catch {
    return { jobId: null, error: 'Falha ao acessar chave OpenRouter.' }
  }

  const { data: catalog } = await supabase
    .from('catalogs')
    .select('file_path, page_count')
    .eq('id', catalogId)
    .eq('brand_id', brandId)
    .single()

  if (!catalog?.file_path) {
    return { jobId: null, error: 'Catálogo não encontrado.' }
  }

  const pagesTotal = catalog.page_count ?? oldJob.pages_total

  // Create new extraction job
  const { data: newJob, error: jobError } = await supabase
    .from('extraction_jobs')
    .insert({
      catalog_id: catalogId,
      brand_id: brandId,
      admin_user_id: adminId,
      model_id: modelId,
      pages_total: pagesTotal,
    })
    .select('id')
    .single()

  if (jobError || !newJob) {
    return { jobId: null, error: 'Erro ao criar novo job de extração.' }
  }

  await supabase.from('catalogs').update({ status: 'processing' }).eq('id', catalogId)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let edgeFnOk = false
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/extract-catalog`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Key': openrouterKey,
      },
      body: JSON.stringify({
        jobId: newJob.id,
        catalogId,
        brandId,
        filePath: catalog.file_path,
        modelId,
        pagesTotal,
      }),
    })
    edgeFnOk = res.ok
  } catch {
    edgeFnOk = false
  }

  if (!edgeFnOk) {
    await supabase.from('extraction_jobs').delete().eq('id', newJob.id)
    await supabase.from('catalogs').update({ status: 'awaiting_extraction' }).eq('id', catalogId)
    return { jobId: null, error: 'Não foi possível iniciar a re-extração.' }
  }

  return { jobId: newJob.id, error: null }
}
