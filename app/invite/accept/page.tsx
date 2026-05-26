import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AcceptInviteForm } from './_components/accept-invite-form'

export const metadata = { title: 'Aceitar Convite — CAMMES' }

export default async function AcceptInvitePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CAMMES</h1>
          <p className="text-sm text-muted-foreground">Configure sua conta para continuar</p>
        </div>
        <AcceptInviteForm />
      </div>
    </main>
  )
}
