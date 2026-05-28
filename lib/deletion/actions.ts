'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/log-event'
import { sendEmail } from '@/lib/email/send-email'
import { deletionRequestedEmail, deletionCompletedEmail } from '@/lib/email/templates'
import type { Result } from '@/lib/types/index'

export interface DeletionRequest {
  id: number
  user_id: string | null
  user_email: string
  requested_at: string
  status: 'pending' | 'in_review' | 'completed'
  completed_at: string | null
  processed_by: string | null
  admin_notes: string | null
}

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

function conflictError(message: string): Result<never> {
  return {
    ok: false,
    error: {
      code: 'CONFLICT',
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  }
}

export async function requestAccountDeletion(): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const serviceSupabase = createServiceRoleSupabaseClient()

  const { data: profile } = await serviceSupabase
    .from('users_profile')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const userEmail = profile?.email ?? user.email ?? ''

  const { data: existing } = await serviceSupabase
    .from('deletion_requests')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'in_review'])
    .maybeSingle()

  if (existing) return conflictError('Já existe uma solicitação de exclusão pendente para esta conta')

  const { error: insertError } = await serviceSupabase.from('deletion_requests').insert({
    user_id: user.id,
    user_email: userEmail,
  })
  if (insertError) return internalError(insertError.message)

  await logAuditEvent('account_deletion_requested', {
    userId: user.id,
    requestedAt: new Date().toISOString(),
  })

  void sendEmail({
    to: userEmail,
    subject: 'Solicitação de exclusão de conta recebida',
    html: deletionRequestedEmail(profile?.full_name ?? ''),
  })

  return { ok: true, data: undefined }
}

export async function executeAccountDeletion(targetUserId: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const serviceSupabase = createServiceRoleSupabaseClient()

  const { data: callerProfile } = await serviceSupabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin')
    return permissionDenied('Apenas admins podem processar exclusões')

  const { data: targetProfile } = await serviceSupabase
    .from('users_profile')
    .select('email, full_name')
    .eq('id', targetUserId)
    .single()
  if (!targetProfile) return internalError('Perfil não encontrado')
  const savedEmail = targetProfile.email

  const anonymizedEmail = `removed-${targetUserId}@deleted.cammes`

  await serviceSupabase
    .from('users_profile')
    .update({
      full_name: 'Conta removida',
      email: anonymizedEmail,
      phone: null,
      is_active: false,
    })
    .eq('id', targetUserId)

  await serviceSupabase
    .from('orders')
    .update({ customer_name: 'Cliente removido' })
    .eq('customer_user_id', targetUserId)

  const { data: orders } = await serviceSupabase
    .from('orders')
    .select('id')
    .eq('customer_user_id', targetUserId)

  if (orders?.length) {
    await serviceSupabase
      .from('order_items')
      .update({ customer_name: 'Cliente removido' })
      .in(
        'order_id',
        orders.map((o) => o.id),
      )
  }

  await serviceSupabase.auth.admin.updateUserById(targetUserId, {
    email: anonymizedEmail,
    ban_duration: 'none',
  })

  await serviceSupabase
    .from('deletion_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      processed_by: user.id,
    })
    .eq('user_id', targetUserId)
    .eq('status', 'pending')

  await logAuditEvent('account_deletion_completed', {
    targetUserId,
    processedBy: user.id,
    completedAt: new Date().toISOString(),
  })

  void sendEmail({
    to: savedEmail,
    subject: 'Exclusão de conta processada',
    html: deletionCompletedEmail(),
  })

  return { ok: true, data: undefined }
}

export async function listPendingDeletionRequests(): Promise<Result<DeletionRequest[]>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const serviceSupabase = createServiceRoleSupabaseClient()

  const { data: callerProfile } = await serviceSupabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin')
    return permissionDenied('Apenas admins podem listar solicitações de exclusão')

  const { data, error } = await serviceSupabase
    .from('deletion_requests')
    .select('*')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) return internalError(error.message)

  return { ok: true, data: (data ?? []) as DeletionRequest[] }
}

export async function getMyDeletionRequest(): Promise<Result<DeletionRequest | null>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const { data, error } = await supabase
    .from('deletion_requests')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['pending', 'in_review'])
    .maybeSingle()

  if (error) return internalError(error.message)

  return { ok: true, data: data as DeletionRequest | null }
}

export async function getCustomerDeletionRequest(
  customerId: string,
): Promise<Result<DeletionRequest | null>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const serviceSupabase = createServiceRoleSupabaseClient()

  const { data: callerProfile } = await serviceSupabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin')
    return permissionDenied('Apenas admins podem consultar solicitações de exclusão')

  const { data, error } = await serviceSupabase
    .from('deletion_requests')
    .select('*')
    .eq('user_id', customerId)
    .eq('status', 'pending')
    .maybeSingle()

  if (error) return internalError(error.message)

  return { ok: true, data: data as DeletionRequest | null }
}
