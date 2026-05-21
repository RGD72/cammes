'use client'

import { useState, useActionState, useTransition } from 'react'
import { updatePasswordAction } from '@/lib/auth/actions'

type ActionState = { error?: string } | undefined

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updatePasswordAction,
    undefined,
  )
  const [isPending, startTransition] = useTransition()
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')

  function validatePassword(value: string) {
    setPasswordError(
      value.length > 0 && value.length < 8 ? 'Senha deve ter no mínimo 8 caracteres.' : '',
    )
  }

  function validateConfirm(password: string, confirm: string) {
    setConfirmError(
      confirm.length > 0 && password !== confirm ? 'As senhas não coincidem.' : '',
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (passwordError || confirmError) return
    const formData = new FormData(event.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    if (password.length < 8 || password !== confirmPassword) return
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {state?.error && (
        <div
          id="reset-error"
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          onChange={(e) => {
            validatePassword(e.target.value)
            const form = e.currentTarget.form
            const confirm = form?.elements.namedItem('confirmPassword') as HTMLInputElement | null
            if (confirm?.value) validateConfirm(e.target.value, confirm.value)
          }}
          aria-describedby={
            passwordError ? 'password-error' : state?.error ? 'reset-error' : undefined
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="••••••••"
          disabled={isPending}
        />
        {passwordError && (
          <p id="password-error" className="text-sm text-destructive">
            {passwordError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
          Confirmar senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          onChange={(e) => {
            const form = e.currentTarget.form
            const password = form?.elements.namedItem('password') as HTMLInputElement | null
            validateConfirm(password?.value ?? '', e.target.value)
          }}
          aria-describedby={confirmError ? 'confirm-error' : undefined}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="••••••••"
          disabled={isPending}
        />
        {confirmError && (
          <p id="confirm-error" className="text-sm text-destructive">
            {confirmError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !!passwordError || !!confirmError}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Redefinindo…' : 'Redefinir senha'}
      </button>
    </form>
  )
}
