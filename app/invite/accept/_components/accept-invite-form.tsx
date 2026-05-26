'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { acceptInviteTerms } from '@/lib/customers/actions'

export function AcceptInviteForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const password = fd.get('password') as string
    const terms = fd.get('terms')

    if (!terms) {
      setError('Você deve aceitar os termos para continuar.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setError(null)
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }

      const result = await acceptInviteTerms()
      if (!result.ok) {
        setError(result.error.message)
        return
      }

      router.push('/brands')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded border bg-background px-3 py-2 text-sm"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input name="terms" type="checkbox" required className="mt-0.5" />
        <span>
          Li e aceito os{' '}
          <a href="/legal/terms" target="_blank" className="underline hover:no-underline">
            Termos de Uso
          </a>{' '}
          e a{' '}
          <a href="/legal/privacy" target="_blank" className="underline hover:no-underline">
            Política de Privacidade
          </a>
          .
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-foreground px-3 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Aguarde...' : 'Confirmar e acessar'}
      </button>
    </form>
  )
}
