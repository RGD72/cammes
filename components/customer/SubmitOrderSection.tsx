'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitOrder } from '@/lib/orders/actions'
import { ConfirmOrderDialog } from './ConfirmOrderDialog'

interface SubmitOrderSectionProps {
  brandId: string
  itemCount: number
  totalBrl: number
}

export function SubmitOrderSection({ brandId, itemCount, totalBrl }: SubmitOrderSectionProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  // Stable idempotency key per dialog mount — resets when dialog closes and reopens
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  function handleOpen() {
    setIsOpen(true)
  }

  function handleClose() {
    if (isPending) return
    setIsOpen(false)
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await submitOrder(brandId, idempotencyKey)
      if (!result.ok) {
        toast.error('Erro ao enviar pedido', { description: result.error.message })
        setIsOpen(false)
        return
      }
      setIsOpen(false)
      router.push(`/orders/${result.data.order.id}/success`)
    })
  }

  return (
    <>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleOpen}
          className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ENVIAR PEDIDO
        </button>
      </div>

      <ConfirmOrderDialog
        open={isOpen}
        onClose={handleClose}
        itemCount={itemCount}
        totalBrl={totalBrl}
        onConfirm={handleConfirm}
        isPending={isPending}
      />
    </>
  )
}
