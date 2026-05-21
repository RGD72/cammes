import { LoginForm } from './_components/login-form'

export const metadata = { title: 'Entrar — CAMMES' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CAMMES</h1>
          <p className="text-sm text-muted-foreground">Faça login para continuar</p>
        </div>

        {params.message === 'password_updated' && (
          <div
            role="status"
            className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            Senha redefinida com sucesso! Faça login com sua nova senha.
          </div>
        )}

        {params.error === 'auth_callback_failed' && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            O link expirou ou é inválido. Solicite um novo.
          </div>
        )}

        <LoginForm />
      </div>
    </main>
  )
}
