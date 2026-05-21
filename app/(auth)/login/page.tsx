import { LoginForm } from './_components/login-form'

export const metadata = { title: 'Entrar — CAMMES' }

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CAMMES</h1>
          <p className="text-sm text-muted-foreground">Faça login para continuar</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
