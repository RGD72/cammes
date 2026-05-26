import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getOrder } from '@/lib/orders/actions'
import { markOrderViewed } from '@/lib/orders/admin-actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const result = await getOrder(id)
  if (!result.ok) notFound()

  const { order, items } = result.data

  const supabase = await createServerSupabaseClient()
  const { data: brand } = await supabase
    .from('brands')
    .select('name')
    .eq('id', order.brand_id)
    .single()

  async function handleMarkViewed() {
    'use server'
    await markOrderViewed(id)
    redirect(`/admin/orders/${id}`)
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Pedido {order.order_number}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {formatDate(order.submitted_at)} · {brand?.name ?? order.brand_id} · {order.customer_name}
          </p>
          <p className="mt-1 text-sm font-medium">Total: R$ {order.total_brl.toFixed(2)}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {order.status === 'received' ? (
            <form action={handleMarkViewed}>
              <button
                type="submit"
                className="rounded border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                Marcar como visto
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-800">
                Visto
              </span>
              {order.viewed_at && (
                <span className="text-xs text-foreground/50">{formatDate(order.viewed_at)}</span>
              )}
            </div>
          )}

          <a
            href={`/api/orders/${id}/pdf`}
            className="rounded bg-foreground px-3 py-1.5 text-sm text-background font-medium hover:opacity-90"
          >
            Baixar PDF
          </a>

          <button
            type="button"
            disabled
            className="rounded border px-3 py-1.5 text-sm text-foreground/40 cursor-not-allowed"
            title="Em breve"
          >
            Exportar CSV (em breve)
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-foreground/70">
              <th className="py-2 pr-3 font-medium">Referência</th>
              <th className="py-2 pr-3 font-medium">Descrição</th>
              <th className="py-2 pr-3 font-medium">Cor</th>
              <th className="py-2 pr-3 font-medium">Tamanho</th>
              <th className="py-2 pr-3 font-medium">Qtd</th>
              <th className="py-2 pr-3 font-medium">Nome do Cliente</th>
              <th className="py-2 pr-3 font-medium">Valor da Peça</th>
              <th className="py-2 font-medium">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2 pr-3">{item.reference}</td>
                <td className="py-2 pr-3">{item.description}</td>
                <td className="py-2 pr-3">{item.color ?? '—'}</td>
                <td className="py-2 pr-3">{item.size ?? '—'}</td>
                <td className="py-2 pr-3">{item.quantity}</td>
                <td className="py-2 pr-3">{item.customer_name}</td>
                <td className="py-2 pr-3">R$ {item.unit_price_brl.toFixed(2)}</td>
                <td className="py-2">R$ {item.total_brl.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link href="/admin/orders" className="text-sm underline text-foreground/60 hover:text-foreground">
          ← Voltar para pedidos
        </Link>
      </div>
    </div>
  )
}
