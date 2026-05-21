import { ResetPasswordForm } from './_components/reset-password-form'

export const metadata = { title: 'Redefinir senha — CAMMES' }

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma nova senha para sua conta
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
