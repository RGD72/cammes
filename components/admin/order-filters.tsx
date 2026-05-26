'use client'

import Link from 'next/link'
import type { AdminOrderFilters } from '@/lib/orders/admin-actions'

interface Props {
  brands: Array<{ id: string; name: string }>
  currentFilters: AdminOrderFilters
}

export function OrderFilters({ brands, currentFilters }: Props) {
  return (
    <form method="GET" action="/admin/orders" className="flex flex-wrap gap-3 items-end p-4 border-b bg-muted/40">
      <div className="flex flex-col gap-1">
        <label htmlFor="brand" className="text-xs font-medium text-foreground/70">
          Marca
        </label>
        <select
          id="brand"
          name="brand"
          defaultValue={currentFilters.brandId ?? ''}
          className="rounded border px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Todas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customer" className="text-xs font-medium text-foreground/70">
          Cliente
        </label>
        <input
          id="customer"
          name="customer"
          type="text"
          defaultValue={currentFilters.customerName ?? ''}
          placeholder="Nome do cliente"
          className="rounded border px-2 py-1.5 text-sm bg-background w-44"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateFrom" className="text-xs font-medium text-foreground/70">
          De
        </label>
        <input
          id="dateFrom"
          name="dateFrom"
          type="date"
          defaultValue={currentFilters.dateFrom ?? ''}
          className="rounded border px-2 py-1.5 text-sm bg-background"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateTo" className="text-xs font-medium text-foreground/70">
          Até
        </label>
        <input
          id="dateTo"
          name="dateTo"
          type="date"
          defaultValue={currentFilters.dateTo ?? ''}
          className="rounded border px-2 py-1.5 text-sm bg-background"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium text-foreground/70">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={currentFilters.status ?? ''}
          className="rounded border px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Todos</option>
          <option value="received">Recebido</option>
          <option value="viewed">Visto</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-foreground px-3 py-1.5 text-sm text-background font-medium hover:opacity-90"
        >
          Filtrar
        </button>
        <Link
          href="/admin/orders"
          className="rounded border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          Limpar
        </Link>
      </div>
    </form>
  )
}
