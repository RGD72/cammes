'use client'

function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ConfirmOrderDialogProps {
  open: boolean
  onClose: () => void
  itemCount: number
  totalBrl: number
  onConfirm: () => void
  isPending: boolean
}

export function ConfirmOrderDialog({
  open,
  onClose,
  itemCount,
  totalBrl,
  onConfirm,
  isPending,
}: ConfirmOrderDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold">
          Confirmar pedido
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Confirmar envio de{' '}
          <strong>
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </strong>{' '}
          — Total <strong>{brl(totalBrl)}</strong>?
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          O pedido será registrado permanentemente e você receberá um comprovante.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Enviando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
