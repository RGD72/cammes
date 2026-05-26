export const runtime = 'nodejs'

import { getAuditLogsForCsv } from '@/lib/audit/actions'
import type { AuditLogFilters } from '@/lib/audit/actions'

function escapeCell(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sp = url.searchParams

  const filters: AuditLogFilters = {
    event_type: sp.get('event_type') ?? undefined,
    from: sp.get('from') ?? undefined,
    to: sp.get('to') ?? undefined,
  }

  const result = await getAuditLogsForCsv(filters)
  if (!result.ok) {
    const status = result.error.code === 'PERMISSION_DENIED' ? 403 : 500
    return new Response(JSON.stringify({ error: result.error.message }), { status })
  }

  const { rows, truncated } = result.data

  const BOM = '﻿'
  const HEADER = 'id;created_at;event_type;user_email;target_resource_type;target_resource_id;ip_address;payload'
  const lines = [HEADER]

  for (const row of rows) {
    const cells = [
      String(row.id),
      escapeCell(row.created_at),
      escapeCell(row.event_type),
      escapeCell(row.user_email ?? ''),
      escapeCell(row.target_resource_type ?? ''),
      escapeCell(row.target_resource_id ?? ''),
      escapeCell(row.ip_address ?? ''),
      escapeCell(JSON.stringify(row.payload)),
    ]
    lines.push(cells.join(';'))
  }

  const csv = BOM + lines.join('\r\n') + '\r\n'
  const date = new Date().toISOString().slice(0, 10)
  const filename = `auditoria-${date}.csv`

  const headers: Record<string, string> = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  }
  if (truncated) headers['X-Truncated'] = 'true'

  return new Response(csv, { headers })
}
