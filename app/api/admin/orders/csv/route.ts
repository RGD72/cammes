export const runtime = 'nodejs'

import { getAdminOrdersForCsv } from '@/lib/orders/admin-actions'
import { generateCsv } from '@/lib/csv/generate-csv'
import type { AdminOrderFilters } from '@/lib/orders/admin-actions'
import type { CsvRow } from '@/lib/csv/generate-csv'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sp = url.searchParams

  const filters: AdminOrderFilters = {
    brandId: sp.get('brand') ?? undefined,
    customerName: sp.get('customer') ?? undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
    status: (sp.get('status') as AdminOrderFilters['status']) ?? undefined,
  }

  const result = await getAdminOrdersForCsv(filters)
  if (!result.ok) {
    const status = result.error.code === 'PERMISSION_DENIED' ? 403 : 500
    return new Response(JSON.stringify({ error: result.error.message }), { status })
  }

  const { items, truncated } = result.data

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
  const date = new Date().toISOString().slice(0, 10)
  const filename = `pedidos-${date}.csv`

  const headers: Record<string, string> = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  }
  if (truncated) headers['X-Truncated'] = 'true'

  return new Response(csv, { headers })
}
