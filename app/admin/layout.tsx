import { AdminNav } from '@/components/admin/admin-nav'
import { LogoutButton } from '@/components/ui/logout-button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r flex flex-col">
        <div className="p-4 border-b font-semibold">CAMMES Admin</div>
        <AdminNav />
        <div className="p-2 border-t">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
