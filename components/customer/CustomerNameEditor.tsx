'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { setCustomerName } from '@/lib/carts/actions'

interface CustomerNameEditorProps {
  brandId: string
  initialName: string
}

export function CustomerNameEditor({ brandId, initialName }: CustomerNameEditorProps) {
  const [name, setName] = useState(initialName)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await setCustomerName(brandId, name.trim())
      if (result.ok) {
        toast.success('Nome do cliente atualizado')
      } else {
        toast.error(result.error.message)
        setName(initialName)
      }
    })
  }

  return (
    <div className="flex items-center gap-3 mb-6 p-4 rounded-lg border bg-muted/20">
      <label htmlFor="customer-name" className="text-sm font-medium whitespace-nowrap">
        Nome do Cliente
      </label>
      <input
        id="customer-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isPending}
        className="flex-1 rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        placeholder="Nome do cliente"
        maxLength={100}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || name.trim() === ''}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
