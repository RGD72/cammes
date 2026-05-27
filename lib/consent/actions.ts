'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/log-event'
import type { Result } from '@/lib/types/index'

function permissionDenied(message = 'Não autenticado'): Result<never> {
  return {
    ok: false,
    error: {
      code: 'PERMISSION_DENIED',
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  }
}

function internalError(message: string): Result<never> {
  return {
    ok: false,
    error: {
      code: 'INTERNAL',
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  }
}

export interface ConsentLogEntry {
  id: number
  document_version: string
  accepted_at: string
  ip_address: string | null
}

export async function recordConsent(documentVersion: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  let ipAddress: string | null = null
  try {
    const h = await headers()
    ipAddress =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  } catch {
    // headers() indisponível fora de contexto de request
  }

  const serviceSupabase = createServiceRoleSupabaseClient()
  const { error: insertError } = await serviceSupabase.from('consent_log').insert({
    user_id: user.id,
    document_version: documentVersion,
    ip_address: ipAddress,
  })
  if (insertError) return internalError(insertError.message)

  await supabase
    .from('users_profile')
    .update({ consented_version: documentVersion })
    .eq('id', user.id)

  await logAuditEvent('consent_accepted', { userId: user.id, documentVersion })

  return { ok: true, data: undefined }
}

export async function getConsentHistory(): Promise<Result<ConsentLogEntry[]>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const { data, error } = await supabase
    .from('consent_log')
    .select('id, document_version, accepted_at, ip_address')
    .eq('user_id', user.id)
    .order('accepted_at', { ascending: false })

  if (error) return internalError(error.message)

  return { ok: true, data: (data ?? []) as ConsentLogEntry[] }
}
