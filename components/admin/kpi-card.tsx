import Link from 'next/link'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  href: string
  trend?: { value: number; positive: boolean }
}

export function KpiCard({ title, value, subtitle, href, trend }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {trend !== undefined && (
        <p className={`mt-1 text-sm font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.positive ? '+' : ''}{trend.value.toFixed(1)}% vs mês anterior
        </p>
      )}
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </Link>
  )
}
