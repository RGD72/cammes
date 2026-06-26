import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/ui/logout-button'
import { Toaster } from 'sonner'

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
          <div className="flex items-center gap-6">
            <span className="font-semibold">CAMMES</span>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/brands" className="text-muted-foreground hover:text-foreground">
                Marcas
              </Link>
              <Link href="/orders" className="text-muted-foreground hover:text-foreground">
                Meus pedidos
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <Toaster richColors position="top-center" />
    </div>
  )
}
