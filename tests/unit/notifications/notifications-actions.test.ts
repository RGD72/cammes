import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notifications/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ---- fixtures ---------------------------------------------------------------

const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000070'
const NOTIF_ID = '00000000-0000-0000-0000-000000000001'
const BRAND_ID = '00000000-0000-0000-0000-000000000002'
const ORDER_ID = '00000000-0000-0000-0000-000000000003'

const MOCK_NOTIF = {
  id: NOTIF_ID,
  admin_user_id: ADMIN_USER_ID,
  type: 'new_order',
  order_id: ORDER_ID,
  brand_id: BRAND_ID,
  read: false,
  created_at: '2026-05-25T10:00:00Z',
  brands: { name: 'Marca Teste' },
}

function makeClient(userId: string | null, queryResult: unknown = { data: [], error: null }) {
  const selectBuilder = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(queryResult),
  }

  const updateBuilder = {
    eq: vi.fn().mockReturnThis(),
    then: vi.fn(),
  }
  // last .eq() in chain should resolve
  ;(updateBuilder.eq as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(selectBuilder),
      update: vi.fn().mockReturnValue(updateBuilder),
    }),
  }
}

// ---- tests ------------------------------------------------------------------

describe('notifications actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('P-NOTIF-1: admin autenticado retorna lista (máx 10, read=false)', async () => {
      const client = makeClient(ADMIN_USER_ID, { data: [MOCK_NOTIF], error: null })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      const result = await getNotifications()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].brands?.name).toBe('Marca Teste')
      }

      const fromReturn = client.from.mock.results[0].value
      expect(fromReturn.select).toHaveBeenCalledWith('*, brands(name)')
      const selectReturn = fromReturn.select.mock.results[0].value
      expect(selectReturn.eq).toHaveBeenCalledWith('read', false)
      expect(selectReturn.limit).toHaveBeenCalledWith(10)
    })

    it('N-NOTIF-1: não autenticado retorna PERMISSION_DENIED', async () => {
      const client = makeClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      const result = await getNotifications()

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('PERMISSION_DENIED')
      }
    })
  })

  describe('markNotificationRead', () => {
    it('P-NOTIF-2: markNotificationRead chama UPDATE com WHERE id e admin_user_id', async () => {
      const eqChain = vi.fn().mockResolvedValue({ error: null })
      const updateBuilder = {
        eq: vi.fn().mockReturnValue({ eq: eqChain }),
      }
      const client = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: ADMIN_USER_ID } },
          }),
        },
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue(updateBuilder),
        }),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      const result = await markNotificationRead(NOTIF_ID)

      expect(result.ok).toBe(true)
      expect(updateBuilder.eq).toHaveBeenCalledWith('id', NOTIF_ID)
      expect(eqChain).toHaveBeenCalledWith('admin_user_id', ADMIN_USER_ID)
    })
  })

  describe('markAllNotificationsRead', () => {
    it('P-NOTIF-3: markAllNotificationsRead chama UPDATE WHERE read=false', async () => {
      const eqChain = vi.fn().mockResolvedValue({ error: null })
      const updateBuilder = {
        eq: vi.fn().mockReturnValue({ eq: eqChain }),
      }
      const client = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: ADMIN_USER_ID } },
          }),
        },
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue(updateBuilder),
        }),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      const result = await markAllNotificationsRead()

      expect(result.ok).toBe(true)
      expect(updateBuilder.eq).toHaveBeenCalledWith('admin_user_id', ADMIN_USER_ID)
      expect(eqChain).toHaveBeenCalledWith('read', false)
    })
  })

  describe('getUnreadCount', () => {
    it('retorna 0 quando não autenticado (graceful)', async () => {
      const client = makeClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      const count = await getUnreadCount()
      expect(count).toBe(0)
    })

    it('retorna count quando autenticado', async () => {
      const selectBuilder = {
        eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
      }
      const client = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: ADMIN_USER_ID } },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectBuilder),
        }),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      const count = await getUnreadCount()
      expect(count).toBe(3)
    })
  })
})
