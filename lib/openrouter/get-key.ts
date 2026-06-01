import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { decryptKey } from '@/lib/openrouter/crypto'

export async function getAdminOpenRouterKey(adminId: string): Promise<string | null> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const { data, error } = await supabase
      .from('admin_settings')
      .select('openrouter_key_encrypted')
      .eq('admin_user_id', adminId)
      .single()

    if (error || !data?.openrouter_key_encrypted) return null

    return await decryptKey(data.openrouter_key_encrypted)
  } catch {
    return null
  }
}

export async function getAdminOpenRouterModel(adminId: string): Promise<string> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const { data, error } = await supabase
      .from('admin_settings')
      .select('openrouter_model')
      .eq('admin_user_id', adminId)
      .single()

    if (error || !data?.openrouter_model) return 'google/gemini-2.5-flash'

    return data.openrouter_model
  } catch {
    return 'google/gemini-2.5-flash'
  }
}
