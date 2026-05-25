'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import {
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notifications/actions'
import type { NotificationWithBrand } from '@/lib/notifications/actions'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

interface Props {
  initialCount: number
  initialNotifications: NotificationWithBrand[]
}

export function NotificationBell({ initialCount, initialNotifications }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isPending, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Polling a cada 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      const newCount = await getUnreadCount()
      setCount(newCount)
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Fechar com Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function handleMarkRead(notif: NotificationWithBrand) {
    startTransition(async () => {
      await markNotificationRead(notif.id)
      setCount((c) => Math.max(0, c - 1))
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
      router.refresh()
      setOpen(false)
      if (notif.order_id) {
        router.push(`/admin/orders/${notif.order_id}`)
      }
    })
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setCount(0)
      setNotifications([])
      router.refresh()
      setOpen(false)
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label={count > 0 ? `${count} notificações não lidas` : 'Notificações'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border bg-white shadow-lg"
        >
          <div className="border-b px-4 py-2">
            <p className="text-sm font-semibold">Notificações</p>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação não lida
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((notif) => (
                <li key={notif.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isPending}
                    onClick={() => handleMarkRead(notif)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted disabled:opacity-50"
                  >
                    <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        Novo pedido — {notif.brands?.name ?? 'Marca'}
                      </p>
                      <p className="text-xs text-muted-foreground">{relativeTime(notif.created_at)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {notifications.length > 0 && (
            <div className="border-t px-4 py-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleMarkAll}
                className="w-full rounded-md px-3 py-1.5 text-center text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
