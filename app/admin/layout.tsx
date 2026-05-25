import { AdminNav } from '@/components/admin/admin-nav'
import { LogoutButton } from '@/components/ui/logout-button'
import { NotificationBell } from '@/components/admin/notification-bell'
import { getNotifications, getUnreadCount } from '@/lib/notifications/actions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [notifResult, unreadCount] = await Promise.all([getNotifications(), getUnreadCount()])

  const initialNotifications = notifResult.ok ? notifResult.data : []
  const initialCount = unreadCount

  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r flex flex-col">
        <div className="p-4 border-b font-semibold">CAMMES Admin</div>
        <AdminNav />
        <div className="p-2 border-t">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-end border-b px-4 py-2 h-12">
          <NotificationBell initialCount={initialCount} initialNotifications={initialNotifications} />
        </header>
        {children}
      </main>
    </div>
  )
}
