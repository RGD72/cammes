import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getMyDeletionRequest } from '@/lib/deletion/actions'
import { DeletionRequestForm } from './_components/deletion-request-form'

export const metadata = { title: 'Excluir Conta — CAMMES' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default async function AccountDeletePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const requestResult = await getMyDeletionRequest()
  const existingRequest = requestResult.ok ? requestResult.data : null

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">Excluir minha conta</h1>

      {existingRequest ? (
        <div className="rounded border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Sua solicitação está em análise.</p>
          <p className="mt-1 text-muted-foreground">
            Solicitado em {formatDate(existingRequest.requested_at)}. Processamento em até 15 dias
            a partir de {formatDate(addDays(existingRequest.requested_at, 15))}.
          </p>
        </div>
      ) : (
        <DeletionRequestForm />
      )}
    </div>
  )
}
