import Link from 'next/link'
import { LogoutButton } from '@/components/ui/logout-button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r flex flex-col">
        <div className="p-4 border-b font-semibold">CAMMES Admin</div>
        <nav className="flex-1 p-2 space-y-1">
          <Link
            href="/admin/brands"
            className="block rounded px-3 py-2 text-sm hover:bg-muted"
          >
            Marcas
          </Link>
          <Link
            href="/admin/orders"
            className="block rounded px-3 py-2 text-sm hover:bg-muted"
          >
            Pedidos
          </Link>
          <Link
            href="/admin/settings"
            className="block rounded px-3 py-2 text-sm hover:bg-muted"
          >
            Configurações
          </Link>
        </nav>
        <div className="p-2 border-t">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
