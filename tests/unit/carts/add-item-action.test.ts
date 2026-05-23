import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { addItem } from '@/lib/carts/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const VALID_INPUT = {
  brandId: '00000000-0000-0000-0000-000000000001',
  productId: '00000000-0000-0000-0000-000000000002',
  color: 'Azul',
  size: 'M',
  quantity: 2,
  unitPriceBrl: 99.9,
}

const MOCK_CART_ITEM = {
  id: 'item-001',
  cart_id: 'cart-001',
  product_id: VALID_INPUT.productId,
  color: 'Azul',
  size: 'M',
  quantity: 2,
  unit_price_brl_snapshot: 99.9,
  total_brl: 199.8,
  added_at: '2026-05-23T00:00:00Z',
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

function makeSuccessClient() {
  // Sequence of from() calls in addItem (new cart path):
  // 1. from('products').select().eq().single() → product with price_brl
  // 2. from('carts').select().eq().eq().maybeSingle() → null (no existing cart)
  // 3. from('users_profile').select().eq().single() → profile
  // 4. from('carts').insert().select().single() → new cart
  // 5. from('cart_items').insert().select().single() → new item

  const productChain = makeChain({ data: { price_brl: 99.9 }, error: null })
  const cartsExistChain = makeChain({ data: null, error: null })
  const profileChain = makeChain({ data: { full_name: 'Test User' }, error: null })
  const cartsInsertChain = makeChain({ data: { id: 'cart-001' }, error: null })
  const itemChain = makeChain({ data: MOCK_CART_ITEM, error: null })

  let fromCallIndex = 0
  const fromSequence = [
    productChain,
    cartsExistChain,
    profileChain,
    cartsInsertChain,
    itemChain,
  ]

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    from: vi.fn().mockImplementation(() => fromSequence[fromCallIndex++]),
  }
}

function makeAuthOnlyClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('addItem', () => {
  it('P-AI-1: usuário autenticado + produto acessível retorna CartItem com snapshot correto', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSuccessClient(),
    )

    const result = await addItem(VALID_INPUT)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.quantity).toBe(2)
      expect(result.data.unit_price_brl_snapshot).toBe(99.9)
      expect(result.data.total_brl).toBe(199.8)
      expect(result.data.color).toBe('Azul')
      expect(result.data.size).toBe('M')
    }
  })

  it('N-AI-1: retorna PERMISSION_DENIED quando usuário não autenticado', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthOnlyClient(null),
    )

    const result = await addItem(VALID_INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })

  it('N-AI-2: retorna VALIDATION_ERROR quando input inválido (quantity: 0)', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthOnlyClient({ id: 'user-123' }),
    )

    const result = await addItem({ ...VALID_INPUT, quantity: 0 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('N-AI-3: retorna PERMISSION_DENIED quando sem acesso à marca', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
      },
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      from: vi.fn(),
    })

    const result = await addItem(VALID_INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})
