import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getCart, updateQuantity, removeItem, clearCart } from '@/lib/carts/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const BRAND_ID = '00000000-0000-0000-0000-000000000001'
const CART_ID = '00000000-0000-0000-0000-000000000010'
const ITEM_ID = '00000000-0000-0000-0000-000000000020'

const MOCK_CART = {
  id: CART_ID,
  user_id: 'user-123',
  brand_id: BRAND_ID,
  customer_name: 'Test User',
  created_at: '2026-05-23T00:00:00Z',
  updated_at: '2026-05-23T00:00:00Z',
}

const MOCK_ITEM = {
  id: ITEM_ID,
  cart_id: CART_ID,
  product_id: '00000000-0000-0000-0000-000000000002',
  color: 'Azul',
  size: 'M',
  quantity: 2,
  unit_price_brl_snapshot: 50.0,
  total_brl: 100.0,
  added_at: '2026-05-23T00:00:00Z',
}

function makeAuthUser() {
  return { data: { user: { id: 'user-123' } } }
}

function makeNoAuth() {
  return { data: { user: null } }
}

function makeChain(terminalResult: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'insert', 'update', 'delete', 'upsert']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain['single'] = vi.fn().mockResolvedValue(terminalResult)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(terminalResult)
  return chain
}

function makeDeleteChain(count: number, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain['delete'] = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error, count }),
  })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// getCart
// ---------------------------------------------------------------------------
describe('getCart', () => {
  it('P-GC-1: retorna cart + items + total calculado quando carrinho existe', async () => {
    const cartChain = makeChain({ data: MOCK_CART, error: null })
    const itemsChain = makeChain({ data: [MOCK_ITEM], error: null })
    // getCart awaits .order() directly — no .single()/.maybeSingle() terminal call
    ;(itemsChain['order'] as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [MOCK_ITEM],
      error: null,
    })

    let fromCallIndex = 0
    const fromSequence = [cartChain, itemsChain]

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation(() => fromSequence[fromCallIndex++]),
    })

    const result = await getCart(BRAND_ID)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.cart.id).toBe(CART_ID)
      expect(result.data.total).toBe(100.0)
    }
  })

  it('N-GC-1: retorna NOT_FOUND quando carrinho não existe', async () => {
    const cartChain = makeChain({ data: null, error: null })

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue(cartChain),
    })

    const result = await getCart(BRAND_ID)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
    }
  })

  it('N-Auth-GC: retorna PERMISSION_DENIED sem auth', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeNoAuth()) },
      from: vi.fn(),
    })

    const result = await getCart(BRAND_ID)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})

// ---------------------------------------------------------------------------
// updateQuantity
// ---------------------------------------------------------------------------
describe('updateQuantity', () => {
  it('P-UQ-1: atualiza quantity e recalcula total_brl', async () => {
    const updatedItem = { ...MOCK_ITEM, quantity: 3, total_brl: 150.0 }
    const fetchChain = makeChain({ data: { unit_price_brl_snapshot: 50.0 }, error: null })
    const updateChain = makeChain({ data: updatedItem, error: null })

    let fromCallIndex = 0
    const fromSequence = [fetchChain, updateChain]

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation(() => fromSequence[fromCallIndex++]),
    })

    const result = await updateQuantity({ itemId: ITEM_ID, quantity: 3 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.quantity).toBe(3)
      expect(result.data.total_brl).toBe(150.0)
    }
  })

  it('N-UQ-1: retorna NOT_FOUND quando item não existe', async () => {
    const fetchChain = makeChain({ data: null, error: null })

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue(fetchChain),
    })

    const result = await updateQuantity({ itemId: ITEM_ID, quantity: 3 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
    }
  })

  it('N-Auth-UQ: retorna PERMISSION_DENIED sem auth', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeNoAuth()) },
      from: vi.fn(),
    })

    const result = await updateQuantity({ itemId: ITEM_ID, quantity: 3 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------
describe('removeItem', () => {
  it('P-RI-1: remove item existente retorna ok: true', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue(makeDeleteChain(1)),
    })

    const result = await removeItem(ITEM_ID)

    expect(result.ok).toBe(true)
  })

  it('N-RI-1: retorna NOT_FOUND quando item não existe (0 rows deletadas)', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue(makeDeleteChain(0)),
    })

    const result = await removeItem(ITEM_ID)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND')
    }
  })

  it('N-Auth-RI: retorna PERMISSION_DENIED sem auth', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeNoAuth()) },
      from: vi.fn(),
    })

    const result = await removeItem(ITEM_ID)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})

// ---------------------------------------------------------------------------
// clearCart
// ---------------------------------------------------------------------------
describe('clearCart', () => {
  it('P-CC-1: limpa cart existente retorna ok: true', async () => {
    const cartChain = makeChain({ data: { id: CART_ID }, error: null })

    // Second from() call is delete on cart_items
    const deleteItemsChain = {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }

    let fromCallIndex = 0
    const fromSequence = [cartChain, deleteItemsChain]

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation(() => fromSequence[fromCallIndex++]),
    })

    const result = await clearCart(BRAND_ID)

    expect(result.ok).toBe(true)
  })

  it('N-CC-1: retorna ok: true quando cart não existe (idempotente)', async () => {
    const cartChain = makeChain({ data: null, error: null })

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue(cartChain),
    })

    const result = await clearCart(BRAND_ID)

    // Idempotent: succeed even if cart doesn't exist
    expect(result.ok).toBe(true)
  })

  it('N-Auth-CC: retorna PERMISSION_DENIED sem auth', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeNoAuth()) },
      from: vi.fn(),
    })

    const result = await clearCart(BRAND_ID)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})
