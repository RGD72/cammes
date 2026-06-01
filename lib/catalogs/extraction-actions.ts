'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { decryptKey } from '@/lib/openrouter/crypto'

export interface StartExtractionResult {
  jobId: string | null
  error: string | null
}

export async function startExtractionJob(
  catalogId: string,
  brandId: string,
  catalogPageCount: number,
): Promise<StartExtractionResult> {
  const supabaseUser = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabaseUser.auth.getUser()
  if (!user) return { jobId: null, error: 'Usuário não autenticado.' }

  const adminId = user.id
  const supabase = createServiceRoleSupabaseClient()

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
    modelId = settings.openrouter_model ?? 'google/gemini-flash-2.5'
  } catch {
    return { jobId: null, error: 'Falha ao acessar chave OpenRouter.' }
  }

  const { data: catalog } = await supabase
    .from('catalogs')
    .select('file_path')
    .eq('id', catalogId)
    .eq('brand_id', brandId)
    .single()

  if (!catalog?.file_path) {
    return { jobId: null, error: 'Catálogo não encontrado.' }
  }

  const { data: job, error: jobError } = await supabase
    .from('extraction_jobs')
    .insert({
      catalog_id: catalogId,
      brand_id: brandId,
      admin_user_id: adminId,
      model_id: modelId,
      pages_total: catalogPageCount,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    return { jobId: null, error: 'Erro ao criar job de extração.' }
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
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
        'X-OpenRouter-Key': openrouterKey,
      },
      body: JSON.stringify({
        jobId: job.id,
        catalogId,
        brandId,
        filePath: catalog.file_path,
        modelId,
        pagesTotal: catalogPageCount,
      }),
    })
    edgeFnOk = res.ok
  } catch {
    edgeFnOk = false
  }

  if (!edgeFnOk) {
    await supabase.from('extraction_jobs').delete().eq('id', job.id)
    await supabase.from('catalogs').update({ status: 'awaiting_extraction' }).eq('id', catalogId)
    return { jobId: null, error: 'Não foi possível iniciar a extração.' }
  }

  return { jobId: job.id, error: null }
}
