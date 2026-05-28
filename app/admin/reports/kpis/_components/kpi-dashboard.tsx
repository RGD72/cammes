'use client'

import type { KpiDashboard, KpiResult, KpiStatus } from '@/lib/kpis/queries'

function statusClass(status: KpiStatus): string {
  switch (status) {
    case 'good':
      return 'bg-green-50 border-green-200 text-green-800'
    case 'warn':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    case 'bad':
      return 'bg-red-50 border-red-200 text-red-800'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-600'
  }
}

function statusBadge(status: KpiStatus): string {
  switch (status) {
    case 'good':
      return 'bg-green-100 text-green-700'
    case 'warn':
      return 'bg-yellow-100 text-yellow-700'
    case 'bad':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

function statusLabel(status: KpiStatus): string {
  switch (status) {
    case 'good':
      return 'Meta atingida'
    case 'warn':
      return 'Atenção'
    case 'bad':
      return 'Abaixo da meta'
    default:
      return 'Sem meta'
  }
}

interface KpiCardProps {
  sigla: string
  name: string
  result: KpiResult
}

function KpiCard({ sigla, name, result }: KpiCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${statusClass(result.status)}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wide opacity-60">
            {sigla}
          </span>
          <p className="text-sm font-medium mt-0.5">{name}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(result.status)}`}>
          {statusLabel(result.status)}
        </span>
      </div>
      <p className="text-2xl font-bold mt-3">{result.formatted}</p>
      <p className="text-xs mt-1 opacity-70">Meta: {result.target}</p>
      {result.note && (
        <p className="text-xs mt-2 opacity-60 italic">⚠️ {result.note}</p>
      )}
    </div>
  )
}

interface KpiDashboardProps {
  data: KpiDashboard
}

export function KpiDashboardView({ data }: KpiDashboardProps) {
  const kpis: Array<{ sigla: string; name: string; result: KpiResult }> = [
    { sigla: 'TMCV', name: 'Tempo Médio Catálogo→Vitrine', result: data.tmcv },
    { sigla: 'TPE', name: 'Taxa de Precisão da Extração', result: data.tpe },
    { sigla: 'PEE', name: 'Pedidos Estruturados Enviados', result: data.pee },
    { sigla: 'CME', name: 'Custo Médio de Extração', result: data.cme },
    { sigla: 'ABS', name: 'Active Brand Stores', result: data.abs },
    { sigla: 'CtO', name: 'Conversion to Order', result: data.cto },
    { sigla: 'AAD', name: 'Admin Active Daily', result: data.aad },
  ]

  const generated = new Date(data.generatedAt).toLocaleString('pt-BR')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">KPIs do MVP</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Últimos 30 dias · Atualizado a cada 60s
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.sigla} sigla={kpi.sigla} name={kpi.name} result={kpi.result} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        Dados gerados em: {generated} ·{' '}
        <a href="/admin/reports/kpis" className="underline">
          Recarregar
        </a>
      </p>
    </div>
  )
}
