'use server'

import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

export type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'openrouter_key_updated'
  | 'brand_published'
  | 'brand_unpublished'
  | 'extraction_started'
  | 'extraction_completed'
  | 'extraction_failed'
  | 'order_submitted'
  | 'order_viewed'
  | 'customer_invited'
  | 'customer_brand_granted'
  | 'customer_brand_revoked'
  | 'customer_deactivated'
  | 'pdf_downloaded'
  | 'consent_accepted'
  | 'account_deletion_requested'
  | 'account_deletion_completed'
  | (string & Record<never, never>)

export async function logAuditEvent(
  eventType: AuditEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    let ipAddress: string | null = null
    let userAgent: string | null = null
    try {
      const h = await headers()
      ipAddress =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        h.get('x-real-ip') ??
        null
      userAgent = h.get('user-agent') ?? null
    } catch {
      // headers() indisponível fora de contexto de request
    }

    const supabase = createServiceRoleSupabaseClient()
    const userId = (payload.userId as string | undefined) ?? null

    await supabase.from('audit_logs').insert({
      event_type: eventType,
      user_id: userId,
      payload,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  } catch {
    // auditoria NUNCA bloqueia o fluxo principal
  }
}
