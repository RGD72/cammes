export const runtime = 'nodejs'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOrder } from '@/lib/orders/actions'
import { generateCsv } from '@/lib/csv/generate-csv'
import type { CsvRow } from '@/lib/csv/generate-csv'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  const result = await getOrder(id)
  if (!result.ok) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 500
    return new Response(JSON.stringify({ error: result.error.message }), { status })
  }

  const { order, items } = result.data

  const rows: CsvRow[] = items.map((item) => ({
    reference: item.reference,
    description: item.description,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    customer_name: item.customer_name,
    unit_price_brl: item.unit_price_brl,
    total_brl: item.total_brl,
  }))

  const csv = generateCsv(rows)
  const date = order.submitted_at.slice(0, 10)
  const filename = `pedido-${order.order_number}-${date}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
