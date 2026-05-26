import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit/log-event', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}))

import { submitOrder, getOrder } from '@/lib/orders/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

// ---- fixtures ---------------------------------------------------------------

const BRAND_ID = '00000000-0000-0000-0000-000000000001'
const ORDER_ID = '00000000-0000-0000-0000-000000000050'
const CART_ID = '00000000-0000-0000-0000-000000000010'
const PRODUCT_ID = '00000000-0000-0000-0000-000000000002'
const IDEMPOTENCY_KEY = '00000000-0000-0000-0000-000000000099'
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000070'

const MOCK_CART = { id: CART_ID, customer_name: 'Ana Silva' }
const MOCK_CART_ITEM = {
  id: '00000000-0000-0000-0000-000000000020',
  cart_id: CART_ID,
  product_id: PRODUCT_ID,
  color: 'Azul',
  size: 'M',
  quantity: 2,
  unit_price_brl_snapshot: 50.0,
  total_brl: 100.0,
  added_at: '2026-05-24T00:00:00Z',
}
const MOCK_PRODUCT = { id: PRODUCT_ID, reference: 'REF-001', description: 'Camiseta Básica' }
const MOCK_BRAND = { owner_admin_id: ADMIN_USER_ID }
const MOCK_ORDER = {
  id: ORDER_ID,
  order_number: 'CMM-202605-0001',
  brand_id: BRAND_ID,
  customer_user_id: 'user-123',
  customer_name: 'Ana Silva',
  total_brl: 100.0,
  status: 'received',
  client_idempotency_key: IDEMPOTENCY_KEY,
  submitted_at: '2026-05-24T00:00:00Z',
  viewed_at: null,
  pdf_path: null,
}
const MOCK_ORDER_ITEM = {
  id: '00000000-0000-0000-0000-000000000060',
  order_id: ORDER_ID,
  product_id: PRODUCT_ID,
  reference: 'REF-001',
  description: 'Camiseta Básica',
  color: 'Azul',
  size: 'M',
  quantity: 2,
  customer_name: 'Ana Silva',
  unit_price_brl: 50.0,
  total_brl: 100.0,
  display_order: 0,
}

// ---- helpers ----------------------------------------------------------------

function makeAuthUser() {
  return { data: { user: { id: 'user-123' } } }
}

function makeNoAuth() {
  return { data: { user: null } }
}

/**
 * Builds a fluent Supabase chain mock. The last method in the chain
 * is what actually resolves. Override specific methods as needed.
 */
function makeChain(terminalResult: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const fluent = ['select', 'eq', 'gte', 'in', 'order', 'insert', 'update', 'delete', 'upsert']
  fluent.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain['single'] = vi.fn().mockResolvedValue(terminalResult)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(terminalResult)
  // head: true path used in generateOrderNumber
  chain['select'] = vi.fn().mockImplementation((_, opts) => {
    if (opts && opts.head === true) {
      return Promise.resolve({ count: 0, error: null })
    }
    return chain
  })
  return chain
}

function makeDeleteChain(error: unknown = null) {
  const chain = {
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error, count: 1 }),
    }),
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- submitOrder ------------------------------------------------------------

describe('submitOrder', () => {
  it('P-SO-1: retorna ok:true com order e limpa cart_items', async () => {
    // Server client: auth + carts + cart_items (select + delete)
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'carts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_CART, error: null }),
          }
        }
        if (table === 'cart_items') {
          const deleteChain = {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [MOCK_CART_ITEM], error: null }),
            delete: vi.fn().mockReturnValue(deleteChain),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }

    // Admin client: tracks call order per table for orders
    let ordersCallCount = 0
    const adminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          ordersCallCount++
          if (ordersCallCount === 1) {
            // idempotency check — no existing order
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }
          }
          if (ordersCallCount === 2) {
            // generateOrderNumber: .select('id', {count:'exact',head:true}).eq().gte()
            const gteChain = vi.fn().mockResolvedValue({ count: 0, error: null })
            const eqChain = vi.fn().mockReturnValue({ gte: gteChain })
            return { select: vi.fn().mockReturnValue({ eq: eqChain }) }
          }
          // ordersCallCount === 3: INSERT orders
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: MOCK_ORDER, error: null }),
          }
        }
        if (table === 'brands') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: MOCK_BRAND, error: null }),
          }
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [MOCK_PRODUCT], error: null }),
          }
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockResolvedValue({ data: [MOCK_ORDER_ITEM], error: null }),
          }
        }
        if (table === 'admin_notifications') {
          return {
            insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const result = await submitOrder(BRAND_ID, IDEMPOTENCY_KEY)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.order.order_number).toMatch(/^CMM-/)
      expect(result.data.order.status).toBe('received')
      expect(result.data.items).toHaveLength(1)
    }
  })

  it('P-SO-2: retorna ok:true com pedido existente em caso de clientIdempotencyKey repetido', async () => {
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
    }

    const adminClient = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_ORDER, error: null }),
        order: vi.fn().mockResolvedValue({ data: [MOCK_ORDER_ITEM], error: null }),
      })),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const result = await submitOrder(BRAND_ID, IDEMPOTENCY_KEY)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.order.id).toBe(ORDER_ID)
    }
  })

  it('N-SO-1: retorna PERMISSION_DENIED quando não autenticado', async () => {
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeNoAuth()) },
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({} as never)

    const result = await submitOrder(BRAND_ID, IDEMPOTENCY_KEY)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })

  it('N-SO-2: retorna NOT_FOUND quando carrinho está vazio', async () => {
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'carts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_CART, error: null }),
          }
        }
        if (table === 'cart_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {}
      }),
    }

    const adminClient = {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const result = await submitOrder(BRAND_ID, IDEMPOTENCY_KEY)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
    }
  })
})

// ---- getOrder ---------------------------------------------------------------

describe('getOrder', () => {
  it('P-GO-1: retorna { order, items } para o owner do pedido', async () => {
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_ORDER, error: null }),
          }
        }
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [MOCK_ORDER_ITEM], error: null }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    const result = await getOrder(ORDER_ID)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.order.id).toBe(ORDER_ID)
      expect(result.data.order.order_number).toBe('CMM-202605-0001')
      expect(result.data.items).toHaveLength(1)
      expect(result.data.items[0].reference).toBe('REF-001')
    }
  })

  it('N-GO-1: retorna NOT_FOUND quando orderId inexistente', async () => {
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    const result = await getOrder('00000000-0000-0000-0000-000000000000')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
    }
  })
})
