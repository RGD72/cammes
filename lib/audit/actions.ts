'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

const PAGE_SIZE = 25
const CSV_LIMIT = 1000

export interface AuditLogFilters {
  event_type?: string
  from?: string
  to?: string
}

export interface AuditLogRow {
  id: number
  created_at: string
  event_type: string
  user_id: string | null
  user_email: string | null
  target_resource_type: string | null
  target_resource_id: string | null
  ip_address: string | null
  payload: Record<string, unknown>
}

function permissionDenied() {
  return {
    ok: false as const,
    error: { code: 'PERMISSION_DENIED', message: 'Não autenticado' },
  }
}

function internalError(message: string) {
  return {
    ok: false as const,
    error: { code: 'INTERNAL', message },
  }
}

export async function getAuditLogs(
  filters: AuditLogFilters,
  page: number,
): Promise<{ ok: true; data: { rows: AuditLogRow[]; total: number } } | { ok: false; error: { code: string; message: string } }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  let query = supabase
    .from('audit_logs')
    .select('id, created_at, event_type, user_id, target_resource_type, target_resource_id, ip_address, payload, users_profile(email)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (filters.event_type) query = query.eq('event_type', filters.event_type)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to + 'T23:59:59Z')

  const { data, count, error } = await query

  if (error) return internalError(error.message)

  const rows: AuditLogRow[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as number,
    created_at: row.created_at as string,
    event_type: row.event_type as string,
    user_id: (row.user_id as string | null) ?? null,
    user_email: (row.users_profile as { email?: string } | null)?.email ?? null,
    target_resource_type: (row.target_resource_type as string | null) ?? null,
    target_resource_id: (row.target_resource_id as string | null) ?? null,
    ip_address: (row.ip_address as string | null) ?? null,
    payload: (row.payload as Record<string, unknown>) ?? {},
  }))

  return { ok: true, data: { rows, total: count ?? 0 } }
}

export async function getAuditLogsForCsv(
  filters: AuditLogFilters,
): Promise<{ ok: true; data: { rows: AuditLogRow[]; truncated: boolean } } | { ok: false; error: { code: string; message: string } }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  let query = supabase
    .from('audit_logs')
    .select('id, created_at, event_type, user_id, target_resource_type, target_resource_id, ip_address, payload, users_profile(email)')
    .order('created_at', { ascending: false })
    .limit(CSV_LIMIT)

  if (filters.event_type) query = query.eq('event_type', filters.event_type)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to + 'T23:59:59Z')

  const { data, error } = await query

  if (error) return internalError(error.message)

  const raw = data ?? []
  const rows: AuditLogRow[] = raw.map((row: Record<string, unknown>) => ({
    id: row.id as number,
    created_at: row.created_at as string,
    event_type: row.event_type as string,
    user_id: (row.user_id as string | null) ?? null,
    user_email: (row.users_profile as { email?: string } | null)?.email ?? null,
    target_resource_type: (row.target_resource_type as string | null) ?? null,
    target_resource_id: (row.target_resource_id as string | null) ?? null,
    ip_address: (row.ip_address as string | null) ?? null,
    payload: (row.payload as Record<string, unknown>) ?? {},
  }))

  return { ok: true, data: { rows, truncated: raw.length === CSV_LIMIT } }
}

export async function getDistinctEventTypes(): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('audit_logs')
    .select('event_type')
    .order('event_type', { ascending: true })

  if (!data) return []
  const unique = Array.from(new Set(data.map((r: { event_type: string }) => r.event_type)))
  return unique
}
