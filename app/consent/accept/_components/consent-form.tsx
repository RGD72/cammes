'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordConsent } from '@/lib/consent/actions'
import { CURRENT_DOCUMENT_VERSION } from '@/lib/consent/constants'

export function ConsentForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const consent = fd.get('consent')

    if (!consent) {
      setError('Você deve aceitar os termos para continuar.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await recordConsent(CURRENT_DOCUMENT_VERSION)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.push('/brands')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input name="consent" type="checkbox" required className="mt-0.5" />
        <span>
          Li e aceito os{' '}
          <a href="/legal/terms" target="_blank" className="underline hover:no-underline">
            Termos de Uso
          </a>{' '}
          e a{' '}
          <a href="/legal/privacy" target="_blank" className="underline hover:no-underline">
            Política de Privacidade
          </a>{' '}
          (versão {CURRENT_DOCUMENT_VERSION}).
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-foreground px-3 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Aguarde...' : 'Aceitar e continuar'}
      </button>
    </form>
  )
}
