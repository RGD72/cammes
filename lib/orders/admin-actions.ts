'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Result, Order, OrderStatus } from '@/lib/types/index'

const PAGE_SIZE = 25

export interface AdminOrderFilters {
  brandId?: string
  customerName?: string
  dateFrom?: string
  dateTo?: string
  status?: OrderStatus | ''
}

export type AdminOrderRow = Order & { brands: { name: string } | null }

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

export async function getAdminOrders(
  filters: AdminOrderFilters,
  page: number,
): Promise<Result<{ rows: AdminOrderRow[]; total: number }>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  let query = supabase
    .from('orders')
    .select('*, brands(name)', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (filters.brandId) query = query.eq('brand_id', filters.brandId)
  if (filters.customerName) query = query.ilike('customer_name', `%${filters.customerName}%`)
  if (filters.dateFrom) query = query.gte('submitted_at', filters.dateFrom)
  if (filters.dateTo) query = query.lte('submitted_at', filters.dateTo + 'T23:59:59Z')
  if (filters.status) query = query.eq('status', filters.status)

  const { data, count, error } = await query

  if (error) return internalError(error.message)

  return {
    ok: true,
    data: {
      rows: (data ?? []) as AdminOrderRow[],
      total: count ?? 0,
    },
  }
}

export async function markOrderViewed(orderId: string): Promise<Result<void>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return permissionDenied()

  const { error } = await supabase
    .from('orders')
    .update({ status: 'viewed', viewed_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) return internalError(error.message)

  return { ok: true, data: undefined }
}
