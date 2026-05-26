import { getAdminOrders } from '@/lib/orders/admin-actions'
import { listAdminBrands } from '@/lib/brands/actions'
import { OrderFilters } from '@/components/admin/order-filters'
import type { AdminOrderFilters } from '@/lib/orders/admin-actions'
import type { OrderStatus } from '@/lib/types/index'

const PAGE_SIZE = 25

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildPageUrl(filters: AdminOrderFilters, p: number): string {
  const sp = new URLSearchParams()
  if (filters.brandId) sp.set('brand', filters.brandId)
  if (filters.customerName) sp.set('customer', filters.customerName)
  if (filters.dateFrom) sp.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) sp.set('dateTo', filters.dateTo)
  if (filters.status) sp.set('status', filters.status)
  sp.set('page', String(p))
  return `/admin/orders?${sp.toString()}`
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    brand?: string
    customer?: string
    dateFrom?: string
    dateTo?: string
    status?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))

  const filters: AdminOrderFilters = {
    brandId: params.brand || undefined,
    customerName: params.customer || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    status: (params.status as OrderStatus) || undefined,
  }

  const [brands, result] = await Promise.all([listAdminBrands(), getAdminOrders(filters, page)])

  const rows = result.ok ? result.data.rows : []
  const total = result.ok ? result.data.total : 0
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const hasPrev = page > 1
  const hasNext = to < total

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Pedidos</h1>

      <OrderFilters
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        currentFilters={filters}
      />

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-foreground/60">Nenhum pedido encontrado.</p>
      ) : (
        <>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-foreground/70">
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium">Marca</th>
                  <th className="py-2 pr-4 font-medium">Cliente</th>
                  <th className="py-2 pr-4 font-medium">Total (BRL)</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.submitted_at)}</td>
                    <td className="py-2 pr-4">{row.brands?.name ?? '—'}</td>
                    <td className="py-2 pr-4">{row.customer_name}</td>
                    <td className="py-2 pr-4">R$ {row.total_brl.toFixed(2)}</td>
                    <td className="py-2 pr-4">
                      {row.status === 'viewed' ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-800">
                          Visto
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700">
                          Recebido
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <a
                        href={`/admin/orders/${row.id}`}
                        className="text-sm underline hover:opacity-70"
                      >
                        Ver
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-foreground/70">
            <span>
              Pedido {from}–{to} de {total} total
            </span>
            <div className="flex gap-2">
              {hasPrev && (
                <a
                  href={buildPageUrl(filters, page - 1)}
                  className="rounded border px-3 py-1 hover:bg-muted transition-colors"
                >
                  Anterior
                </a>
              )}
              {hasNext && (
                <a
                  href={buildPageUrl(filters, page + 1)}
                  className="rounded border px-3 py-1 hover:bg-muted transition-colors"
                >
                  Próxima
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
