import Link from 'next/link'
import type { RecentOrder } from '@/lib/dashboard/actions'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const STATUS_LABELS: Record<string, string> = {
  received: 'Recebido',
  viewed: 'Visualizado',
}

interface RecentOrdersListProps {
  orders: RecentOrder[]
}

export function RecentOrdersList({ orders }: RecentOrdersListProps) {
  if (orders.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido recente</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Data</th>
            <th className="pb-2 font-medium">Marca</th>
            <th className="pb-2 font-medium">Cliente</th>
            <th className="pb-2 text-right font-medium">Total</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2">{formatDate(order.submitted_at)}</td>
              <td className="py-2">{order.brand_name}</td>
              <td className="py-2">{order.customer_name}</td>
              <td className="py-2 text-right">{formatCurrency(order.total_brl)}</td>
              <td className="py-2">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="text-primary hover:underline"
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
