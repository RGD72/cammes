import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getAdminOrdersForCsv } from '@/lib/orders/admin-actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000070'
const ORDER_ID = '00000000-0000-0000-0000-000000000001'

const MOCK_ORDER = {
  id: ORDER_ID,
  order_number: 'CMM-202605-0001',
  submitted_at: '2026-05-25T10:00:00Z',
}

const MOCK_ITEM = {
  id: '00000000-0000-0000-0000-000000000010',
  order_id: ORDER_ID,
  product_id: null,
  reference: 'REF-001',
  description: 'Camiseta',
  color: 'Branco',
  size: 'M',
  quantity: 1,
  customer_name: 'Maria',
  unit_price_brl: 89.9,
  total_brl: 89.9,
  display_order: 0,
}

function makeOrdersQueryBuilder(resolvedValue: unknown) {
  const builder: Record<string, unknown> = {}
  for (const method of ['order', 'limit', 'eq', 'ilike', 'gte', 'lte']) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }
  builder['then'] = (
    onfulfilled: (v: unknown) => unknown,
    onrejected?: (e: unknown) => unknown,
  ) => Promise.resolve(resolvedValue).then(onfulfilled, onrejected)
  return builder
}

function makeItemsQueryBuilder(resolvedValue: unknown) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'in', 'order']) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }
  builder['then'] = (
    onfulfilled: (v: unknown) => unknown,
    onrejected?: (e: unknown) => unknown,
  ) => Promise.resolve(resolvedValue).then(onfulfilled, onrejected)
  return builder
}

describe('getAdminOrdersForCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('P-CSV-4: aplica .limit(1000) na query de orders', async () => {
    const ordersQb = makeOrdersQueryBuilder({ data: [MOCK_ORDER], error: null })
    const itemsQb = makeItemsQueryBuilder({ data: [MOCK_ITEM], error: null })

    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_USER_ID } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return { select: vi.fn().mockReturnValue(ordersQb) }
        }
        return itemsQb
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

    const result = await getAdminOrdersForCsv({})

    expect(result.ok).toBe(true)
    expect(ordersQb.limit).toHaveBeenCalledWith(1000)
  })

  it('N-CSV-1: não autenticado retorna PERMISSION_DENIED', async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

    const result = await getAdminOrdersForCsv({})

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })

  it('retorna items com order_number e submitted_at enriquecidos', async () => {
    const ordersQb = makeOrdersQueryBuilder({ data: [MOCK_ORDER], error: null })
    const itemsQb = makeItemsQueryBuilder({ data: [MOCK_ITEM], error: null })

    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_USER_ID } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') return { select: vi.fn().mockReturnValue(ordersQb) }
        return itemsQb
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

    const result = await getAdminOrdersForCsv({})

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items[0].order_number).toBe('CMM-202605-0001')
      expect(result.data.items[0].submitted_at).toBe('2026-05-25T10:00:00Z')
      expect(result.data.truncated).toBe(false)
    }
  })
})
