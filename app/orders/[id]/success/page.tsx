import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
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

export default async function OrderSuccessPage({ params }: Props) {
  const { id } = await params
  const result = await getOrder(id)

  if (!result.ok) return notFound()

  const { order } = result.data

  const supabase = await createServerSupabaseClient()
  const { data: brand } = await supabase
    .from('brands')
    .select('slug')
    .eq('id', order.brand_id)
    .single()

  const brandSlug = brand?.slug ?? ''

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 text-4xl">✅</div>
        <h1 className="text-2xl font-bold text-foreground">Pedido enviado com sucesso!</h1>
        <p className="mt-2 text-muted-foreground">
          Seu pedido foi registrado e o administrador da marca foi notificado.
        </p>

        <div className="mt-6 rounded-lg bg-muted/50 px-6 py-4 text-left">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-muted-foreground">Número do pedido</dt>
              <dd className="font-mono font-semibold">{order.order_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-muted-foreground">Data</dt>
              <dd>{formatDate(order.submitted_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-muted-foreground">Total</dt>
              <dd className="font-semibold">{brl(Number(order.total_brl))}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={`/orders/${order.id}`}
            className="rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Ver detalhe do pedido
          </a>

          <div className="relative">
            <button
              type="button"
              disabled
              title="Gerando PDF..."
              className="cursor-not-allowed rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground opacity-50"
            >
              Baixar PDF
            </button>
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
              Gerando PDF...
            </span>
          </div>
        </div>

        {brandSlug && (
          <div className="mt-4">
            <a
              href={`/brands/${brandSlug}`}
              className="text-sm text-primary underline hover:no-underline"
            >
              Voltar à vitrine
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
