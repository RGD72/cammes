'use client'

import { useState, useActionState, useTransition } from 'react'
import { requestPasswordResetAction } from '@/lib/auth/actions'

type ActionState = { error?: string; success?: string } | undefined

export function RecoverPasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
    undefined,
  )
  const [isPending, startTransition] = useTransition()
  const [emailError, setEmailError] = useState('')

  function validateEmail(value: string) {
    if (!value) {
      setEmailError('')
      return
    }
    setEmailError(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'E-mail inválido')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (emailError) return
    const formData = new FormData(event.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  if (state?.success) {
    return (
      <div
        role="status"
        className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        {state.success}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {state?.error && (
        <div
          id="recover-error"
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          onChange={(e) => validateEmail(e.target.value)}
          aria-describedby={
            emailError ? 'email-error' : state?.error ? 'recover-error' : undefined
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="seu@email.com"
          disabled={isPending}
        />
        {emailError && (
          <p id="email-error" className="text-sm text-destructive">
            {emailError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !!emailError}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Enviando…' : 'Enviar link de recuperação'}
      </button>
    </form>
  )
}
