import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/orders/actions'

interface Props {
  params: Promise<{ id: string }>
}

function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const result = await getOrder(id)

  if (!result.ok) return notFound()

  const { order, items } = result.data

  const totalBrl = items.reduce((sum, i) => sum + Number(i.total_brl), 0)

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pedido {order.order_number}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(order.submitted_at)}</p>
        </div>
        <a
          href={`/api/orders/${order.id}/pdf`}
          download
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Baixar PDF
        </a>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                Referência
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                Descrição do Produto
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                Cor
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                Tamanho
              </th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wide text-muted-foreground">
                Quantidade
              </th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-muted-foreground">
                Nome do Cliente
              </th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wide text-muted-foreground">
                Valor da Peça
              </th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wide text-muted-foreground">
                Valor Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{item.reference}</td>
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3">{item.color ?? '—'}</td>
                <td className="px-4 py-3">{item.size ?? '—'}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3">{item.customer_name}</td>
                <td className="px-4 py-3 text-right">{brl(Number(item.unit_price_brl))}</td>
                <td className="px-4 py-3 text-right font-medium">{brl(Number(item.total_brl))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 bg-muted/50">
            <tr>
              <td colSpan={7} className="px-4 py-3 font-semibold text-right">
                Total Geral
              </td>
              <td className="px-4 py-3 text-right font-bold">{brl(totalBrl)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-4 md:hidden">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border p-4 text-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">{item.reference}</span>
              <span className="font-medium">{brl(Number(item.total_brl))}</span>
            </div>
            <p className="font-medium">{item.description}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {item.color && (
                <>
                  <dt>Cor</dt>
                  <dd>{item.color}</dd>
                </>
              )}
              {item.size && (
                <>
                  <dt>Tamanho</dt>
                  <dd>{item.size}</dd>
                </>
              )}
              <dt>Quantidade</dt>
              <dd>{item.quantity}</dd>
              <dt>Nome do cliente</dt>
              <dd>{item.customer_name}</dd>
              <dt>Valor unitário</dt>
              <dd>{brl(Number(item.unit_price_brl))}</dd>
            </dl>
          </div>
        ))}
        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-right text-sm font-bold">
          Total Geral: {brl(totalBrl)}
        </div>
      </div>
    </div>
  )
}
