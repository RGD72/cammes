'use server'

import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

export type KpiStatus = 'good' | 'warn' | 'bad' | 'na'

export interface KpiResult {
  value: number | null
  formatted: string
  target: string
  status: KpiStatus
  note?: string
}

export interface KpiDashboard {
  tmcv: KpiResult
  tpe: KpiResult
  pee: KpiResult
  cme: KpiResult
  abs: KpiResult
  cto: KpiResult
  aad: KpiResult
  generatedAt: string
}

function fmt(n: number | null, suffix = ''): string {
  if (n === null) return '—'
  return `${n.toFixed(1)}${suffix}`
}

export async function getTmcv(): Promise<KpiResult> {
  const supabase = createServiceRoleSupabaseClient()

  const { data: rows } = await supabase
    .from('extraction_jobs')
    .select('created_at, completed_at')
    .eq('status', 'done')
    .not('completed_at', 'is', null)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (!rows || rows.length === 0) {
    return { value: null, formatted: '—', target: '<60 min', status: 'na', note: 'Sem dados suficientes' }
  }

  const totalMinutes = rows.reduce((sum, row) => {
    const created = new Date(row.created_at).getTime()
    const completed = new Date(row.completed_at as string).getTime()
    return sum + (completed - created) / 60000
  }, 0)

  const avg = totalMinutes / rows.length

  return {
    value: avg,
    formatted: fmt(avg, ' min'),
    target: '<60 min',
    status: avg < 60 ? 'good' : avg < 120 ? 'warn' : 'bad',
  }
}

export async function getTpe(): Promise<KpiResult> {
  const supabase = createServiceRoleSupabaseClient()

  const { data: rows } = await supabase
    .from('products')
    .select('status')
    .in('status', ['approved', 'extracted', 'hidden'])

  if (!rows || rows.length === 0) {
    return { value: null, formatted: '—', target: '>=85%', status: 'na', note: 'Sem produtos extraídos' }
  }

  const approved = rows.filter((r) => r.status === 'approved').length
  const pct = (approved / rows.length) * 100

  return {
    value: pct,
    formatted: fmt(pct, '%'),
    target: '>=85%',
    status: pct >= 85 ? 'good' : pct >= 70 ? 'warn' : 'bad',
    note: 'Aproximação — validação manual necessária para precisão real',
  }
}

export async function getPee(): Promise<KpiResult> {
  const supabase = createServiceRoleSupabaseClient()

  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const value = count ?? 0

  return {
    value,
    formatted: String(value),
    target: '+20% MoM',
    status: 'na',
    note: 'Comparação MoM disponível em Phase 2',
  }
}

export async function getCme(): Promise<KpiResult> {
  const supabase = createServiceRoleSupabaseClient()

  const { data: rows } = await supabase
    .from('extraction_jobs')
    .select('actual_cost_brl')
    .eq('status', 'done')
    .not('actual_cost_brl', 'is', null)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (!rows || rows.length === 0) {
    return { value: null, formatted: '—', target: '<R$50', status: 'na', note: 'Sem dados de custo' }
  }

  const avg = rows.reduce((sum, r) => sum + Number(r.actual_cost_brl), 0) / rows.length

  return {
    value: avg,
    formatted: `R$${fmt(avg)}`,
    target: '<R$50',
    status: avg <= 50 ? 'good' : avg <= 75 ? 'warn' : 'bad',
  }
}

export async function getAbs(): Promise<KpiResult> {
  const supabase = createServiceRoleSupabaseClient()

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: orderRows } = await supabase
    .from('orders')
    .select('brand_id')
    .gte('created_at', cutoff)

  if (!orderRows || orderRows.length === 0) {
    return { value: 0, formatted: '0', target: '>=10', status: 'bad' }
  }

  const brandIdsWithOrders = [...new Set(orderRows.map((r) => r.brand_id))]

  const { count } = await supabase
    .from('brands')
    .select('*', { count: 'exact', head: true })
    .eq('published', true)
    .in('id', brandIdsWithOrders)

  const value = count ?? 0

  return {
    value,
    formatted: String(value),
    target: '>=10',
    status: value >= 10 ? 'good' : value >= 5 ? 'warn' : 'bad',
  }
}

export async function getCto(): Promise<KpiResult> {
  const supabase = createServiceRoleSupabaseClient()

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows } = await supabase
    .from('audit_logs')
    .select('event_type, user_id')
    .in('event_type', ['cart_item_added', 'order_submitted'])
    .gte('created_at', cutoff)

  if (!rows || rows.length === 0) {
    return {
      value: null,
      formatted: '—',
      target: '>=70%',
      status: 'na',
      note: 'Sem dados de carrinho (evento cart_item_added)',
    }
  }

  const addedUsers = new Set(
    rows.filter((r) => r.event_type === 'cart_item_added').map((r) => r.user_id),
  )
  const orderedUsers = new Set(
    rows.filter((r) => r.event_type === 'order_submitted').map((r) => r.user_id),
  )

  if (addedUsers.size === 0) {
    return {
      value: null,
      formatted: '—',
      target: '>=70%',
      status: 'na',
      note: 'Sem dados de carrinho (evento cart_item_added)',
    }
  }

  const pct = (orderedUsers.size / addedUsers.size) * 100

  return {
    value: pct,
    formatted: fmt(pct, '%'),
    target: '>=70%',
    status: pct >= 70 ? 'good' : pct >= 50 ? 'warn' : 'bad',
  }
}

export async function getAad(): Promise<KpiResult> {
  const supabase = createServiceRoleSupabaseClient()

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows } = await supabase
    .from('audit_logs')
    .select('created_at, user_id')
    .eq('event_type', 'login_success')
    .gte('created_at', cutoff)

  if (!rows || rows.length === 0) {
    return { value: 0, formatted: '0 dias', target: '>=50% admins ativos/dia', status: 'na' }
  }

  // Get admin user IDs to filter
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  const { data: adminProfiles } = await supabase
    .from('users_profile')
    .select('id')
    .eq('role', 'admin')
    .in('id', userIds)

  const adminIds = new Set((adminProfiles ?? []).map((p) => p.id))

  const adminLoginDays = new Set(
    rows
      .filter((r) => r.user_id && adminIds.has(r.user_id))
      .map((r) => new Date(r.created_at).toISOString().slice(0, 10)),
  )

  const value = adminLoginDays.size

  return {
    value,
    formatted: `${value} dias`,
    target: '>=50% admins ativos/dia',
    status: 'na',
    note: 'Comparação por % de admins disponível em Phase 2',
  }
}

export async function getAllKpis(): Promise<KpiDashboard> {
  const [tmcv, tpe, pee, cme, abs, cto, aad] = await Promise.all([
    getTmcv(),
    getTpe(),
    getPee(),
    getCme(),
    getAbs(),
    getCto(),
    getAad(),
  ])

  return { tmcv, tpe, pee, cme, abs, cto, aad, generatedAt: new Date().toISOString() }
}
