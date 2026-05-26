import { getAuditLogs, getDistinctEventTypes } from '@/lib/audit/actions'
import type { AuditLogFilters } from '@/lib/audit/actions'

const PAGE_SIZE = 25

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildPageUrl(filters: AuditLogFilters, p: number): string {
  const sp = new URLSearchParams()
  if (filters.event_type) sp.set('event_type', filters.event_type)
  if (filters.from) sp.set('from', filters.from)
  if (filters.to) sp.set('to', filters.to)
  sp.set('page', String(p))
  return `/admin/audit?${sp.toString()}`
}

function buildCsvUrl(filters: AuditLogFilters): string {
  const sp = new URLSearchParams()
  if (filters.event_type) sp.set('event_type', filters.event_type)
  if (filters.from) sp.set('from', filters.from)
  if (filters.to) sp.set('to', filters.to)
  const qs = sp.toString()
  return `/api/admin/audit/csv${qs ? `?${qs}` : ''}`
}

const EVENT_CATEGORY: Record<string, { label: string; className: string }> = {
  login_success: { label: 'Auth', className: 'bg-green-100 text-green-800' },
  login_failed: { label: 'Auth', className: 'bg-red-100 text-red-800' },
  logout: { label: 'Auth', className: 'bg-gray-100 text-gray-700' },
  brand_published: { label: 'Marca', className: 'bg-blue-100 text-blue-800' },
  brand_unpublished: { label: 'Marca', className: 'bg-blue-100 text-blue-800' },
  order_submitted: { label: 'Pedido', className: 'bg-purple-100 text-purple-800' },
  order_viewed: { label: 'Pedido', className: 'bg-purple-100 text-purple-800' },
  pdf_downloaded: { label: 'Pedido', className: 'bg-purple-100 text-purple-800' },
  customer_invited: { label: 'Cliente', className: 'bg-yellow-100 text-yellow-800' },
  customer_brand_granted: { label: 'Cliente', className: 'bg-yellow-100 text-yellow-800' },
  customer_brand_revoked: { label: 'Cliente', className: 'bg-yellow-100 text-yellow-800' },
  customer_deactivated: { label: 'Cliente', className: 'bg-yellow-100 text-yellow-800' },
  openrouter_key_updated: { label: 'Config', className: 'bg-orange-100 text-orange-800' },
}

function EventBadge({ eventType }: { eventType: string }) {
  const cat = EVENT_CATEGORY[eventType]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs mr-1 ${cat?.className ?? 'bg-gray-100 text-gray-700'}`}
    >
      {cat?.label ?? 'Outro'}
    </span>
  )
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    event_type?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))

  const filters: AuditLogFilters = {
    event_type: params.event_type || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  }

  const [eventTypes, result] = await Promise.all([
    getDistinctEventTypes(),
    getAuditLogs(filters, page),
  ])

  const rows = result.ok ? result.data.rows : []
  const total = result.ok ? result.data.total : 0
  const pageFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const pageTo = Math.min(page * PAGE_SIZE, total)
  const hasPrev = page > 1
  const hasNext = pageTo < total

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Log de Auditoria</h1>

      <form method="GET" action="/admin/audit" className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60" htmlFor="event_type">
            Evento
          </label>
          <select
            id="event_type"
            name="event_type"
            defaultValue={filters.event_type ?? ''}
            className="rounded border px-2 py-1 text-sm bg-background"
          >
            <option value="">Todos</option>
            {eventTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60" htmlFor="from">
            De
          </label>
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={filters.from ?? ''}
            className="rounded border px-2 py-1 text-sm bg-background"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60" htmlFor="to">
            Até
          </label>
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={filters.to ?? ''}
            className="rounded border px-2 py-1 text-sm bg-background"
          />
        </div>

        <button
          type="submit"
          className="rounded border px-3 py-1 text-sm hover:bg-muted transition-colors"
        >
          Filtrar
        </button>
        <a
          href="/admin/audit"
          className="rounded border px-3 py-1 text-sm hover:bg-muted transition-colors"
        >
          Limpar
        </a>
      </form>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-foreground/60">Nenhum evento encontrado.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-foreground/70">
                  <th className="py-2 pr-4 font-medium">Data/Hora</th>
                  <th className="py-2 pr-4 font-medium">Evento</th>
                  <th className="py-2 pr-4 font-medium">Usuário</th>
                  <th className="py-2 pr-4 font-medium">Recurso</th>
                  <th className="py-2 font-medium">Payload</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 pr-4 whitespace-nowrap text-xs text-foreground/70">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <EventBadge eventType={row.event_type} />
                      <span className="text-xs">{row.event_type}</span>
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {row.user_email ?? (row.user_id ? row.user_id.slice(0, 8) + '…' : '—')}
                    </td>
                    <td className="py-2 pr-4 text-xs text-foreground/70">
                      {row.target_resource_type
                        ? `${row.target_resource_type}${row.target_resource_id ? `/${row.target_resource_id}` : ''}`
                        : '—'}
                    </td>
                    <td className="py-2 text-xs font-mono text-foreground/60 max-w-xs truncate">
                      {JSON.stringify(row.payload).slice(0, 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-foreground/70">
            <div className="flex items-center gap-4">
              <span>
                {pageFrom}–{pageTo} de {total} eventos
              </span>
              <a
                href={buildCsvUrl(filters)}
                className="rounded border px-3 py-1 hover:bg-muted transition-colors text-foreground/80"
              >
                Exportar CSV
              </a>
            </div>
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
