import { RecoverPasswordForm } from './_components/recover-password-form'

export const metadata = { title: 'Recuperar senha — CAMMES' }

export default function RecoverPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">
            Digite seu e-mail para receber o link de redefinição
          </p>
        </div>
        <RecoverPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          <a href="/login" className="underline underline-offset-4 hover:text-primary">
            Voltar para o login
          </a>
        </p>
      </div>
    </main>
  )
}
