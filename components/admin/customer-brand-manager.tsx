'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { grantBrandAccess, revokeBrandAccess } from '@/lib/customers/actions'

interface BrandAccess {
  id: string
  name: string
  revoked_at: string | null
}

interface AvailableBrand {
  id: string
  name: string
}

interface Props {
  customerId: string
  assigned: BrandAccess[]
  available: AvailableBrand[]
}

export function CustomerBrandManager({ customerId, assigned, available }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRevoke(brandId: string) {
    startTransition(async () => {
      await revokeBrandAccess(customerId, brandId)
      router.refresh()
    })
  }

  function handleGrant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const brandId = fd.get('brandId') as string
    if (!brandId) return
    startTransition(async () => {
      await grantBrandAccess(customerId, brandId)
      router.refresh()
    })
  }

  const activeBrands = assigned.filter((b) => !b.revoked_at)
  const assignedIds = new Set(activeBrands.map((b) => b.id))
  const unassigned = available.filter((b) => !assignedIds.has(b.id))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-medium">Marcas atribuídas</h3>
        {activeBrands.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma marca atribuída.</p>
        ) : (
          <ul className="space-y-1">
            {activeBrands.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>{b.name}</span>
                <button
                  onClick={() => handleRevoke(b.id)}
                  disabled={isPending}
                  className="text-xs text-destructive hover:underline disabled:opacity-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {unassigned.length > 0 && (
        <form onSubmit={handleGrant} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium" htmlFor="brand-select">
              Adicionar marca
            </label>
            <select
              id="brand-select"
              name="brandId"
              className="w-full rounded border bg-background px-3 py-2 text-sm"
            >
              {unassigned.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90 disabled:opacity-50"
          >
            Conceder acesso
          </button>
        </form>
      )}
    </div>
  )
}
