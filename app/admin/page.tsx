import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('users_profile').select('full_name').eq('id', user.id).single()
    : { data: null }

  const name = profile?.full_name ?? 'Admin'

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Bem-vindo, {name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Epic 1 concluído — autenticação, redirecionamento por papel e perfil funcionando end-to-end.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-6">
          <h2 className="font-medium">Marcas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gerenciamento disponível no Epic 2.</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="font-medium">Pedidos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gestão disponível no Epic 3.</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="font-medium">Usuários</h2>
          <p className="mt-1 text-sm text-muted-foreground">Configurações disponíveis no Epic 5.</p>
        </div>
      </div>
    </div>
  )
}
