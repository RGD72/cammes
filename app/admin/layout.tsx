import { LogoutButton } from '@/components/ui/logout-button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium">CAMMES Admin</span>
        <LogoutButton />
      </header>
      {children}
    </div>
  )
}
