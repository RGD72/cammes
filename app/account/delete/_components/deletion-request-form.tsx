'use client'

import { useState } from 'react'
import { requestAccountDeletion } from '@/lib/deletion/actions'

export function DeletionRequestForm() {
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) return
    setPending(true)
    setError(null)
    try {
      const result = await requestAccountDeletion()
      if (result.ok) {
        setSuccess(true)
      } else {
        setError(result.error.message)
      }
    } finally {
      setPending(false)
    }
  }

  if (success) {
    return (
      <div className="rounded border border-green-300 bg-green-50 p-4 text-sm text-green-800">
        Solicitação recebida — você será notificado por e-mail em até 15 dias.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Esta ação é irreversível.</p>
        <p className="mt-1 text-muted-foreground">
          Seus dados pessoais (nome, e-mail, telefone) serão removidos. O histórico de pedidos será
          mantido de forma anonimizada para fins contábeis.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>
          Entendo que meus dados pessoais serão removidos e esta ação é irreversível.
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={!confirmed || pending}
        className="rounded border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Enviando...' : 'Solicitar exclusão de conta'}
      </button>
    </form>
  )
}
