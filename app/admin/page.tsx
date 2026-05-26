import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getAdminDashboardKpis,
  getRecentOrders,
  getRecentExtractionJobs,
} from '@/lib/dashboard/actions'
import { KpiCard } from '@/components/admin/kpi-card'
import { OrdersChartWrapper } from '@/components/admin/orders-chart-wrapper'
import { RecentOrdersList } from '@/components/admin/recent-orders-list'
import { RecentJobsList } from '@/components/admin/recent-jobs-list'

export const metadata = { title: 'Dashboard — CAMMES Admin' }

function formatCurrency(value: number, currency: 'BRL' | 'USD'): string {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency,
  }).format(value)
}

function calcTrend(
  current: number,
  previous: number,
): { value: number; positive: boolean } | undefined {
  if (previous === 0) return undefined
  const value = ((current - previous) / previous) * 100
  return { value, positive: value >= 0 }
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const adminId = user.id

  const [kpis, recentOrders, recentJobs] = await Promise.all([
    getAdminDashboardKpis(adminId),
    getRecentOrders(adminId),
    getRecentExtractionJobs(adminId),
  ])

  const ordersTrend = calcTrend(kpis.ordersThisMonth, kpis.ordersLastMonth)

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral da operação</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Marcas publicadas"
          value={String(kpis.brandCount)}
          href="/admin/brands"
        />
        <KpiCard
          title="Produtos aprovados"
          value={String(kpis.productCount)}
          href="/admin/brands"
        />
        <KpiCard
          title="Pedidos do mês"
          value={String(kpis.ordersThisMonth)}
          subtitle={`Mês anterior: ${kpis.ordersLastMonth}`}
          href="/admin/orders"
          trend={ordersTrend}
        />
        <KpiCard
          title="Custo OpenRouter (mês)"
          value={formatCurrency(kpis.openrouterCostBrl, 'BRL')}
          subtitle={formatCurrency(kpis.openrouterCostUsd, 'USD')}
          href="/admin/brands"
        />
      </div>

      {/* Orders Chart */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Pedidos por dia — últimos 30 dias</h2>
        <OrdersChartWrapper data={kpis.ordersByDay} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Últimos 5 pedidos</h2>
          <RecentOrdersList orders={recentOrders} />
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Últimos 5 jobs de extração</h2>
          <RecentJobsList jobs={recentJobs} />
        </div>
      </div>
    </div>
  )
}
