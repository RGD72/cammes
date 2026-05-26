import Link from 'next/link'
import type { RecentExtractionJob } from '@/lib/dashboard/actions'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCostUsd(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou',
}

interface RecentJobsListProps {
  jobs: RecentExtractionJob[]
}

export function RecentJobsList({ jobs }: RecentJobsListProps) {
  if (jobs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Nenhum job recente</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Data</th>
            <th className="pb-2 font-medium">Marca</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Páginas</th>
            <th className="pb-2 text-right font-medium">Custo</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2">{formatDate(job.created_at)}</td>
              <td className="py-2">{job.brand_name}</td>
              <td className="py-2">
                <Link
                  href={`/admin/brands/${job.brand_id}/extraction/${job.id}`}
                  className="text-primary hover:underline"
                >
                  {STATUS_LABELS[job.status] ?? job.status}
                </Link>
              </td>
              <td className="py-2">
                {job.pages_processed !== null && job.pages_total !== null
                  ? `${job.pages_processed}/${job.pages_total}`
                  : (job.pages_total ?? '—')}
              </td>
              <td className="py-2 text-right">{formatCostUsd(job.actual_cost_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
