'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ExtractionJob } from '@/app/admin/brands/[id]/extraction/[jobId]/page'

interface Props {
  initialJob: ExtractionJob
  brandId: string
}

const STATUS_LABELS: Record<ExtractionJob['status'], string> = {
  queued: 'Na fila',
  running: 'Processando',
  done: 'Concluído',
  failed: 'Falhou',
}

const STATUS_COLORS: Record<ExtractionJob['status'], string> = {
  queued: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 })

export function ExtractionProgressView({ initialJob, brandId }: Props) {
  const [job, setJob] = useState<ExtractionJob>(initialJob)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`job-${initialJob.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'extraction_jobs',
          filter: `id=eq.${initialJob.id}`,
        },
        (payload) => {
          setJob(payload.new as ExtractionJob)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialJob.id])

  const progress = job.pages_total > 0 ? (job.pages_processed / job.pages_total) * 100 : 0

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Extração em andamento</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[job.status]}`}>
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      <div className="rounded-lg border p-6 space-y-5">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-foreground/60">Progresso</span>
            <span className="font-medium">
              {job.pages_processed} / {job.pages_total} páginas
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-foreground/50">Produtos cadastrados</span>
            <p className="text-lg font-semibold">{job.products_count}</p>
          </div>
          <div>
            <span className="text-foreground/50">Custo real USD</span>
            <p className="text-lg font-semibold">{usdFormatter.format(job.actual_cost_usd ?? 0)}</p>
          </div>
          <div>
            <span className="text-foreground/50">Custo real BRL</span>
            <p className="text-lg font-semibold">{brlFormatter.format(job.actual_cost_brl ?? 0)}</p>
          </div>
        </div>

        {job.error_message && job.status !== 'failed' && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">{job.error_message}</p>
        )}

        {job.status === 'done' && (
          <button
            type="button"
            disabled
            title="Funcionalidade disponível em breve"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
          >
            Revisar produtos
          </button>
        )}

        {job.status === 'failed' && (
          <div className="space-y-3">
            {job.error_message && (
              <p className="text-sm text-red-600 bg-red-50 rounded p-3">{job.error_message}</p>
            )}
            <Link
              href={`/admin/brands/${brandId}`}
              className="inline-block rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              ← Voltar para a marca
            </Link>
          </div>
        )}
      </div>

      <p className="text-xs text-foreground/40">Job ID: {job.id}</p>
    </div>
  )
}
