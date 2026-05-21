import { logoutAction } from '@/lib/auth/actions'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Encerrar sessão"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sair
      </button>
    </form>
  )
}
