'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Painel', href: '/admin' },
  { label: 'Marcas', href: '/admin/brands' },
  { label: 'Pedidos', href: '/admin/orders' },
  { label: 'Configurações', href: '/admin/settings' },
] as const

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-2 space-y-1">
      {NAV_ITEMS.map(({ label, href }) => {
        const isActive =
          href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`block rounded px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-muted font-medium text-foreground'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
