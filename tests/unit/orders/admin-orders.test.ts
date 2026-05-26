import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getAdminOrders, markOrderViewed } from '@/lib/orders/admin-actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ---- fixtures ---------------------------------------------------------------

const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000070'
const ORDER_ID = '00000000-0000-0000-0000-000000000001'
const BRAND_ID = '00000000-0000-0000-0000-000000000002'

const MOCK_ORDER_ROW = {
  id: ORDER_ID,
  order_number: 'CMM-202605-0001',
  brand_id: BRAND_ID,
  customer_user_id: '00000000-0000-0000-0000-000000000003',
  customer_name: 'Cliente Teste',
  total_brl: 150.0,
  status: 'received',
  client_idempotency_key: '00000000-0000-0000-0000-000000000004',
  submitted_at: '2026-05-25T10:00:00Z',
  viewed_at: null,
  pdf_path: null,
  brands: { name: 'Marca Teste' },
}

// Builder that is thenable (awaitable) and returns itself on every filter method
function makeQueryBuilder(resolvedValue: unknown) {
  const builder: Record<string, unknown> = {}

  for (const method of ['order', 'range', 'eq', 'ilike', 'gte', 'lte']) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  builder['then'] = (
    onfulfilled: (v: unknown) => unknown,
    onrejected?: (e: unknown) => unknown,
  ) => Promise.resolve(resolvedValue).then(onfulfilled, onrejected)

  return builder
}

function makeClient(
  userId: string | null,
  queryResult: unknown = { data: [], count: 0, error: null },
) {
  const qb = makeQueryBuilder(queryResult)

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(qb),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }
}

// ---- tests ------------------------------------------------------------------

describe('admin orders actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAdminOrders', () => {
    it('P-ADM-1: retorna lista com brand_name via JOIN quando sem filtros', async () => {
      const client = makeClient(ADMIN_USER_ID, {
        data: [MOCK_ORDER_ROW],
        count: 1,
        error: null,
      })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      const result = await getAdminOrders({}, 1)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.rows).toHaveLength(1)
        expect(result.data.rows[0].brands?.name).toBe('Marca Teste')
        expect(result.data.total).toBe(1)
      }

      const fromReturn = client.from.mock.results[0].value
      expect(fromReturn.select).toHaveBeenCalledWith('*, brands(name)', { count: 'exact' })
    })

    it('P-ADM-2: aplica .eq("status","received") quando filtro de status é received', async () => {
      const client = makeClient(ADMIN_USER_ID, { data: [], count: 0, error: null })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      await getAdminOrders({ status: 'received' }, 1)

      const fromReturn = client.from.mock.results[0].value
      const qb = fromReturn.select.mock.results[0].value
      expect(qb.eq).toHaveBeenCalledWith('status', 'received')
    })

    it('P-ADM-3: aplica OFFSET 25 quando page=2', async () => {
      const client = makeClient(ADMIN_USER_ID, { data: [], count: 30, error: null })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      await getAdminOrders({}, 2)

      const fromReturn = client.from.mock.results[0].value
      const qb = fromReturn.select.mock.results[0].value
      expect(qb.range).toHaveBeenCalledWith(25, 49)
    })

    it('N-ADM-1: não autenticado retorna PERMISSION_DENIED', async () => {
      const client = makeClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

      const result = await getAdminOrders({}, 1)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('PERMISSION_DENIED')
      }
    })
  })

  describe('markOrderViewed', () => {
    it('P-ADM-4: UPDATE SET status=viewed + viewed_at quando orderId válido', async () => {
      const eqChain = vi.fn().mockResolvedValue({ error: null })
      const updateBuilder = { eq: eqChain }
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

      const result = await markOrderViewed(ORDER_ID)

      expect(result.ok).toBe(true)

      const fromReturn = client.from.mock.results[0].value
      expect(fromReturn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'viewed',
          viewed_at: expect.any(String),
        }),
      )
      expect(eqChain).toHaveBeenCalledWith('id', ORDER_ID)
    })
  })
})
