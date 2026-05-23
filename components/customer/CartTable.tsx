'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CartItem } from '@/lib/carts/actions'

export interface CartItemEnriched extends CartItem {
  reference: string | null
  description: string | null
}

interface CartTableProps {
  items: CartItemEnriched[]
  customerName: string
  brandId: string
  onChangeQty: (itemId: string, quantity: number) => Promise<unknown>
  onRemove: (itemId: string) => Promise<unknown>
}

const COLUMNS = [
  'REFERÊNCIA',
  'DESCRIÇÃO DO PRODUTO',
  'COR',
  'TAMANHO',
  'QUANTIDADE',
  'NOME DO CLIENTE',
  'VALOR DA PEÇA',
  'VALOR TOTAL',
]

const MAX_QTY = 99

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function CartTable({ items, customerName, onChangeQty, onRemove }: CartTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (state, { id, quantity }: { id: string; quantity: number }) =>
      state.map((i) =>
        i.id === id
          ? { ...i, quantity, total_brl: i.unit_price_brl_snapshot * quantity }
          : i
      )
  )

  const totalGeral = optimisticItems.reduce((sum, i) => sum + Number(i.total_brl), 0)

  function handleQtyChange(itemId: string, newQty: number) {
    startTransition(async () => {
      updateOptimistic({ id: itemId, quantity: newQty })
      await onChangeQty(itemId, newQty)
      router.refresh()
    })
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      await onRemove(itemId)
      router.refresh()
    })
  }

  return (
    <div className={isPending ? 'opacity-70 pointer-events-none' : ''}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/40">
              {COLUMNS.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">
                  {col}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">
                AÇÕES
              </th>
            </tr>
          </thead>
          <tbody>
            {optimisticItems.map((item) => (
              <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 font-mono text-xs">{item.reference ?? '—'}</td>
                <td className="px-3 py-2 max-w-[200px] truncate">{item.description ?? '—'}</td>
                <td className="px-3 py-2">{item.color ?? '—'}</td>
                <td className="px-3 py-2">{item.size ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      disabled={item.quantity <= 1}
                      onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border text-sm disabled:opacity-40 hover:bg-muted"
                    >
                      −
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      disabled={item.quantity >= MAX_QTY}
                      onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border text-sm disabled:opacity-40 hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2 text-sm">{customerName}</td>
                <td className="px-3 py-2 text-right">{brl(Number(item.unit_price_brl_snapshot))}</td>
                <td className="px-3 py-2 text-right font-medium">{brl(Number(item.total_brl))}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    aria-label="Remover item"
                    onClick={() => handleRemove(item.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold bg-muted/20">
              <td colSpan={7} className="px-3 py-2 text-right text-sm">
                Total Geral
              </td>
              <td className="px-3 py-2 text-right">{brl(totalGeral)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden space-y-4">
        {optimisticItems.map((item) => (
          <div key={item.id} className="rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-xs text-muted-foreground">REFERÊNCIA</span>
              <span className="font-mono text-xs">{item.reference ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-xs text-muted-foreground">DESCRIÇÃO DO PRODUTO</span>
              <span className="text-right max-w-[60%]">{item.description ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-xs text-muted-foreground">COR</span>
              <span>{item.color ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-xs text-muted-foreground">TAMANHO</span>
              <span>{item.size ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-xs text-muted-foreground">QUANTIDADE</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  disabled={item.quantity <= 1}
                  onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded border text-sm disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  disabled={item.quantity >= MAX_QTY}
                  onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded border text-sm disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-xs text-muted-foreground">NOME DO CLIENTE</span>
              <span>{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-xs text-muted-foreground">VALOR DA PEÇA</span>
              <span>{brl(Number(item.unit_price_brl_snapshot))}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="font-medium text-xs text-muted-foreground">VALOR TOTAL</span>
              <span>{brl(Number(item.total_brl))}</span>
            </div>
            <div className="pt-1">
              <button
                type="button"
                aria-label="Remover item"
                onClick={() => handleRemove(item.id)}
                className="text-xs text-destructive hover:underline"
              >
                Remover
              </button>
            </div>
          </div>
        ))}

        <div className="rounded-lg border p-4 font-semibold flex justify-between">
          <span>Total Geral</span>
          <span>{brl(totalGeral)}</span>
        </div>
      </div>
    </div>
  )
}
