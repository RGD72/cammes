'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { encryptKey, decryptKey, maskKey } from '@/lib/openrouter/crypto'
import { testOpenRouterConnection } from '@/lib/openrouter/test-connection'
import { logAuditEvent } from '@/lib/audit/log-event'
import { OPENROUTER_VISION_MODELS } from '@/lib/admin/openrouter-constants'

export interface ActionResult {
  success: boolean
  error?: string
}

export interface OpenRouterStatus {
  hasKey: boolean
  maskedKey: string | null
  model: string
  monthlyCostUsd: number
  monthlyCostBrl: number
}

async function getCurrentAdminId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function saveOpenRouterKey(formData: FormData): Promise<ActionResult> {
  const key = (formData.get('openrouter_key') as string | null)?.trim() ?? ''

  if (!key) return { success: false, error: 'Chave não pode ser vazia.' }
  if (!key.startsWith('sk-or-') || key.length < 20) {
    return { success: false, error: 'Formato inválido. A chave deve começar com sk-or- e ter pelo menos 20 caracteres.' }
  }

  const adminId = await getCurrentAdminId()
  if (!adminId) return { success: false, error: 'Usuário não autenticado.' }

  try {
    const encrypted = await encryptKey(key)
    const supabase = createServiceRoleSupabaseClient()
    const { error } = await supabase.from('admin_settings').upsert(
      { admin_user_id: adminId, openrouter_key_encrypted: encrypted, updated_at: new Date().toISOString() },
      { onConflict: 'admin_user_id' },
    )
    if (error) throw error

    await logAuditEvent('openrouter_key_updated', { admin_user_id: adminId })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return { success: false, error: `Falha ao salvar chave: ${message}` }
  }
}

export async function getOpenRouterStatus(): Promise<OpenRouterStatus> {
  const adminId = await getCurrentAdminId()
  if (!adminId) {
    return { hasKey: false, maskedKey: null, model: 'google/gemini-2.5-flash', monthlyCostUsd: 0, monthlyCostBrl: 0 }
  }

  const supabase = createServiceRoleSupabaseClient()
  const { data } = await supabase
    .from('admin_settings')
    .select('openrouter_key_encrypted, openrouter_model')
    .eq('admin_user_id', adminId)
    .single()

  let hasKey = false
  let maskedKey: string | null = null
  const model = data?.openrouter_model ?? 'google/gemini-2.5-flash'

  if (data?.openrouter_key_encrypted) {
    try {
      const plaintext = await decryptKey(data.openrouter_key_encrypted)
      maskedKey = maskKey(plaintext)
      hasKey = true
    } catch {
      // decryption failure treated as no key
    }
  }

  const { monthlyCostUsd, monthlyCostBrl } = await getMonthlyCost(adminId)

  return { hasKey, maskedKey, model, monthlyCostUsd, monthlyCostBrl }
}

async function getMonthlyCost(adminId: string): Promise<{ monthlyCostUsd: number; monthlyCostBrl: number }> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('extraction_jobs')
      .select('actual_cost_usd')
      .eq('admin_user_id', adminId)
      .gte('created_at', startOfMonth.toISOString())

    if (error) return { monthlyCostUsd: 0, monthlyCostBrl: 0 }

    const totalUsd = (data ?? []).reduce((sum: number, row: { actual_cost_usd: number | null }) => sum + (row.actual_cost_usd ?? 0), 0)
    const rate = parseFloat(process.env.BRL_USD_RATE ?? '5.80')
    return { monthlyCostUsd: totalUsd, monthlyCostBrl: totalUsd * rate }
  } catch {
    return { monthlyCostUsd: 0, monthlyCostBrl: 0 }
  }
}

export async function saveOpenRouterModel(model: string): Promise<ActionResult> {
  const validIds = OPENROUTER_VISION_MODELS.map((m) => m.id)
  if (!validIds.includes(model as (typeof OPENROUTER_VISION_MODELS)[number]['id'])) {
    return { success: false, error: 'Modelo inválido.' }
  }

  const adminId = await getCurrentAdminId()
  if (!adminId) return { success: false, error: 'Usuário não autenticado.' }

  try {
    const supabase = createServiceRoleSupabaseClient()
    const { error } = await supabase.from('admin_settings').upsert(
      { admin_user_id: adminId, openrouter_model: model, updated_at: new Date().toISOString() },
      { onConflict: 'admin_user_id' },
    )
    if (error) throw error
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return { success: false, error: `Falha ao salvar modelo: ${message}` }
  }
}

export async function testOpenRouterKey(
  key: string,
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  return testOpenRouterConnection(key)
}
