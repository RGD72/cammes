import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/ui/logout-button'

export default async function BrandsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('users_profile').select('full_name').eq('id', user.id).single()
    : { data: null }

  const name = profile?.full_name ?? 'Usuário'

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold">CAMMES</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
