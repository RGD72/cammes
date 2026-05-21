import { LogoutButton } from '@/components/ui/logout-button'

export default function BrandsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium">CAMMES</span>
        <LogoutButton />
      </header>
      {children}
    </div>
  )
}
