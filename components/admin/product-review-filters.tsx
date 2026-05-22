'use client'

import { useEffect, useRef } from 'react'

export type ProductStatus = 'extracted' | 'approved' | 'hidden' | 'all'

export interface ReviewFilters {
  searchText: string
  filterLook: string
  filterStatus: ProductStatus
}

interface Props {
  filters: ReviewFilters
  lookOptions: string[]
  onChange: (filters: ReviewFilters) => void
}

export function ProductReviewFilters({ filters, lookOptions, onChange }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, searchText: value.toLowerCase() })
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        placeholder="Buscar referência ou descrição…"
        defaultValue={filters.searchText}
        onChange={(e) => handleSearch(e.target.value)}
        className="h-9 w-64 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
      />

      {lookOptions.length > 0 && (
        <select
          value={filters.filterLook}
          onChange={(e) => onChange({ ...filters, filterLook: e.target.value })}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Todos os LOOKs</option>
          {lookOptions.map((look) => (
            <option key={look} value={look}>
              {look}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.filterStatus}
        onChange={(e) => onChange({ ...filters, filterStatus: e.target.value as ProductStatus })}
        className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="all">Todos os status</option>
        <option value="extracted">Extraído</option>
        <option value="approved">Aprovado</option>
        <option value="hidden">Oculto</option>
      </select>
    </div>
  )
}
