'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Result, AdminNotification } from '@/lib/types/index'

export type NotificationWithBrand = AdminNotification & {
  brands: { name: string } | null
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

export async function getNotifications(): Promise<Result<NotificationWithBrand[]>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*, brands(name)')
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return internalError(error.message)
  return { ok: true, data: (data ?? []) as NotificationWithBrand[] }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)

    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export async function markNotificationRead(id: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('admin_user_id', user.id)

  if (error) return internalError(error.message)
  return { ok: true, data: undefined }
}

export async function markAllNotificationsRead(): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true })
    .eq('admin_user_id', user.id)
    .eq('read', false)

  if (error) return internalError(error.message)
  return { ok: true, data: undefined }
}
