import Link from 'next/link'
import { getMyOrders } from '@/lib/orders/actions'
import { formatPriceBRL } from '@/lib/format/currency'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default async function MyOrdersPage() {
  const result = await getMyOrders()
  const orders = result.ok ? result.data : []

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <h1 className="text-2xl font-semibold mb-6">Meus pedidos</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-foreground/40">
          <p className="text-lg">Você ainda não fez nenhum pedido.</p>
          <Link href="/brands" className="mt-2 inline-block text-sm text-primary hover:underline">
            Ver marcas disponíveis
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                  Pedido
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                  Marca
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                  Data
                </th>
                <th className="px-4 py-3 text-right font-medium uppercase tracking-wide text-muted-foreground">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                  <td className="px-4 py-3">{order.brands?.name ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(order.submitted_at)}</td>
                  <td className="px-4 py-3 text-right">{formatPriceBRL(order.total_brl)}</td>
                  <td className="px-4 py-3">
                    {order.status === 'viewed' ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-800">
                        Visto
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700">
                        Recebido
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/orders/${order.id}`} className="text-sm underline hover:opacity-70">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
