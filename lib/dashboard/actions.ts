'use server'

import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface AdminDashboardKpis {
  brandCount: number
  productCount: number
  ordersThisMonth: number
  ordersLastMonth: number
  openrouterCostUsd: number
  openrouterCostBrl: number
  ordersByDay: Array<{ date: string; count: number }>
}

export interface RecentOrder {
  id: string
  submitted_at: string
  brand_id: string
  brand_name: string
  customer_name: string
  total_brl: number
  status: string
}

export interface RecentExtractionJob {
  id: string
  created_at: string
  brand_id: string
  brand_name: string
  status: string
  pages_total: number | null
  pages_processed: number | null
  actual_cost_usd: number | null
  actual_cost_brl: number | null
  catalog_id: string | null
}

function startOfMonth(offsetMonths = 0): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1))
  return d.toISOString()
}

function thirtyDaysAgo(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
}

async function fetchAdminDashboardKpis(adminId: string): Promise<AdminDashboardKpis> {
  const supabase = await createServerSupabaseClient()

  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .eq('owner_admin_id', adminId)
    .eq('published', true)

  const brandCount = brands?.length ?? 0
  const brandIds = (brands ?? []).map((b: { id: string }) => b.id)

  const [productResult, ordersThisMonthResult, ordersLastMonthResult, costResult, recentOrdersResult] =
    await Promise.all([
      brandIds.length > 0
        ? supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .in('brand_id', brandIds)
            .eq('status', 'approved')
        : Promise.resolve({ count: 0 }),

      brandIds.length > 0
        ? supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('brand_id', brandIds)
            .gte('submitted_at', startOfMonth(0))
        : Promise.resolve({ count: 0 }),

      brandIds.length > 0
        ? supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('brand_id', brandIds)
            .gte('submitted_at', startOfMonth(-1))
            .lt('submitted_at', startOfMonth(0))
        : Promise.resolve({ count: 0 }),

      brandIds.length > 0
        ? supabase
            .from('extraction_jobs')
            .select('actual_cost_usd, actual_cost_brl')
            .in('brand_id', brandIds)
            .gte('completed_at', startOfMonth(0))
        : Promise.resolve({ data: [] }),

      brandIds.length > 0
        ? supabase
            .from('orders')
            .select('submitted_at')
            .in('brand_id', brandIds)
            .gte('submitted_at', thirtyDaysAgo())
        : Promise.resolve({ data: [] }),
    ])

  const productCount = (productResult as { count: number | null }).count ?? 0
  const ordersThisMonth = (ordersThisMonthResult as { count: number | null }).count ?? 0
  const ordersLastMonth = (ordersLastMonthResult as { count: number | null }).count ?? 0

  const jobs = (costResult as { data: Array<{ actual_cost_usd: number | null; actual_cost_brl: number | null }> | null }).data ?? []
  const openrouterCostUsd = jobs.reduce((sum, j) => sum + (j.actual_cost_usd ?? 0), 0)
  const openrouterCostBrl = jobs.reduce((sum, j) => sum + (j.actual_cost_brl ?? 0), 0)

  const rawOrders = (recentOrdersResult as { data: Array<{ submitted_at: string }> | null }).data ?? []
  const dayCounts = new Map<string, number>()
  for (const o of rawOrders) {
    const date = o.submitted_at.slice(0, 10)
    dayCounts.set(date, (dayCounts.get(date) ?? 0) + 1)
  }
  const ordersByDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    brandCount,
    productCount,
    ordersThisMonth,
    ordersLastMonth,
    openrouterCostUsd,
    openrouterCostBrl,
    ordersByDay,
  }
}

export async function getAdminDashboardKpis(adminId: string): Promise<AdminDashboardKpis> {
  return unstable_cache(
    () => fetchAdminDashboardKpis(adminId),
    ['kpis', adminId],
    { tags: [`kpis:admin:${adminId}`], revalidate: 60 },
  )()
}

async function fetchRecentOrders(adminId: string, limit = 5): Promise<RecentOrder[]> {
  const supabase = await createServerSupabaseClient()

  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .eq('owner_admin_id', adminId)

  const brandIds = (brands ?? []).map((b: { id: string }) => b.id)
  const brandNameMap = new Map(
    (brands ?? []).map((b: { id: string; name: string }) => [b.id, b.name]),
  )

  if (brandIds.length === 0) return []

  const { data: orders } = await supabase
    .from('orders')
    .select('id, submitted_at, brand_id, customer_name, total_brl, status')
    .in('brand_id', brandIds)
    .order('submitted_at', { ascending: false })
    .limit(limit)

  return ((orders ?? []) as Array<{
    id: string
    submitted_at: string
    brand_id: string
    customer_name: string
    total_brl: number
    status: string
  }>).map((o) => ({
    id: o.id,
    submitted_at: o.submitted_at,
    brand_id: o.brand_id,
    brand_name: brandNameMap.get(o.brand_id) ?? '',
    customer_name: o.customer_name,
    total_brl: o.total_brl,
    status: o.status,
  }))
}

export async function getRecentOrders(adminId: string, limit = 5): Promise<RecentOrder[]> {
  return unstable_cache(
    () => fetchRecentOrders(adminId, limit),
    ['recent-orders', adminId],
    { tags: [`kpis:admin:${adminId}`], revalidate: 60 },
  )()
}

async function fetchRecentExtractionJobs(
  adminId: string,
  limit = 5,
): Promise<RecentExtractionJob[]> {
  const supabase = await createServerSupabaseClient()

  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .eq('owner_admin_id', adminId)

  const brandIds = (brands ?? []).map((b: { id: string }) => b.id)
  const brandNameMap = new Map(
    (brands ?? []).map((b: { id: string; name: string }) => [b.id, b.name]),
  )

  if (brandIds.length === 0) return []

  const { data: jobs } = await supabase
    .from('extraction_jobs')
    .select(
      'id, created_at, brand_id, status, pages_total, pages_processed, actual_cost_usd, actual_cost_brl, catalog_id',
    )
    .in('brand_id', brandIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((jobs ?? []) as Array<{
    id: string
    created_at: string
    brand_id: string
    status: string
    pages_total: number | null
    pages_processed: number | null
    actual_cost_usd: number | null
    actual_cost_brl: number | null
    catalog_id: string | null
  }>).map((j) => ({
    id: j.id,
    created_at: j.created_at,
    brand_id: j.brand_id,
    brand_name: brandNameMap.get(j.brand_id) ?? '',
    status: j.status,
    pages_total: j.pages_total,
    pages_processed: j.pages_processed,
    actual_cost_usd: j.actual_cost_usd,
    actual_cost_brl: j.actual_cost_brl,
    catalog_id: j.catalog_id,
  }))
}

export async function getRecentExtractionJobs(
  adminId: string,
  limit = 5,
): Promise<RecentExtractionJob[]> {
  return unstable_cache(
    () => fetchRecentExtractionJobs(adminId, limit),
    ['recent-extraction-jobs', adminId],
    { tags: [`kpis:admin:${adminId}`], revalidate: 60 },
  )()
}
