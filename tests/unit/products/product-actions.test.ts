import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { updateProduct, bulkUpdateProductStatus, updateProductsOrder } from '@/lib/products/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const mockUser = { id: 'admin-user-id' }

function makeUserClient(user: typeof mockUser | null = mockUser) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

type ChainMock = {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  from?: ReturnType<typeof vi.fn>
}

function makeChain(singleResult: unknown): ChainMock {
  const chain = {} as ChainMock
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(singleResult)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateProduct', () => {
  it('P-UP-1: persiste campo e valida ownership', async () => {
    const existingProduct = { id: 'prod-1', brand_id: 'brand-1' }
    const updatedProduct = {
      id: 'prod-1',
      brand_id: 'brand-1',
      reference: 'REF-NEW',
      description: 'desc',
      price_brl: null,
      status: 'extracted',
    }

    const existingChain = makeChain({ data: existingProduct, error: null })
    const updatedChain = makeChain({ data: updatedProduct, error: null })

    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      // 1st call: select existing product (ownership check)
      // 2nd call: update product
      return callCount === 1 ? existingChain : updatedChain
    })

    const client = {
      ...makeUserClient(),
      from: fromMock,
    }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await updateProduct('prod-1', 'brand-1', { reference: 'REF-NEW' })

    expect(result.error).toBeNull()
    expect(result.product).toMatchObject({ reference: 'REF-NEW' })
    // Ownership check: select on products with both id and brand_id
    expect(existingChain.eq).toHaveBeenCalledWith('id', 'prod-1')
    expect(existingChain.eq).toHaveBeenCalledWith('brand_id', 'brand-1')
  })

  it('N-UP-1: retorna erro se produto não pertence à marca', async () => {
    const notFoundChain = makeChain({ data: null, error: null })

    const fromMock = vi.fn().mockReturnValue(notFoundChain)
    const client = {
      ...makeUserClient(),
      from: fromMock,
    }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await updateProduct('prod-999', 'other-brand', { reference: 'X' })

    expect(result.product).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error).toContain('não encontrado')
  })
})

describe('bulkUpdateProductStatus', () => {
  it('P-BU-1: atualiza em batch corretamente', async () => {
    const ownedProducts = [{ id: 'p1' }, { id: 'p2' }]
    const productIds = ['p1', 'p2']

    const checkChain = makeChain({ data: ownedProducts, error: null })
    // Override .in() to not call .single() — returns array
    checkChain.in = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: ownedProducts, error: null }),
    })

    const updateChain = {
      update: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }

    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return checkChain
      return updateChain
    })

    const client = {
      ...makeUserClient(),
      from: fromMock,
    }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await bulkUpdateProductStatus(productIds, 'brand-1', 'approved')

    expect(result.error).toBeNull()
    expect(result.updated).toBe(2)
  })

  it('N-BU-1: retorna erro se IDs de outra marca forem incluídos', async () => {
    // Only 1 of 2 products belongs to this brand
    const partialOwned = [{ id: 'p1' }]
    const productIds = ['p1', 'p2']

    const checkChain = makeChain({ data: partialOwned, error: null })
    checkChain.in = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: partialOwned, error: null }),
    })

    const fromMock = vi.fn().mockReturnValue(checkChain)
    const client = {
      ...makeUserClient(),
      from: fromMock,
    }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await bulkUpdateProductStatus(productIds, 'brand-1', 'approved')

    expect(result.updated).toBe(0)
    expect(result.error).toBeTruthy()
    expect(result.error).toContain('não pertencem')
  })
})

describe('updateProductsOrder', () => {
  it('P-OR-1: persiste display_order em batch e retorna updated = N', async () => {
    const orderedIds = ['p1', 'p2', 'p3']
    const ownedProducts = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]

    const checkChain = makeChain({ data: ownedProducts, error: null })
    checkChain.in = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: ownedProducts, error: null }),
    })

    // Each individual update call: .update().eq('id').eq('brand_id') resolves
    const makeUpdateCall = () => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return checkChain
      return makeUpdateCall()
    })

    const client = { ...makeUserClient(), from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await updateProductsOrder(orderedIds, 'brand-1')

    expect(result.error).toBeNull()
    expect(result.updated).toBe(3)
    // check: from() called once for ownership check + 3 times for individual updates
    expect(fromMock).toHaveBeenCalledTimes(4)
  })

  it('N-OR-1: retorna erro se IDs não pertencem à marca', async () => {
    const orderedIds = ['p1', 'p2']
    // Only 1 of 2 owned
    const partialOwned = [{ id: 'p1' }]

    const checkChain = makeChain({ data: partialOwned, error: null })
    checkChain.in = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: partialOwned, error: null }),
    })

    const fromMock = vi.fn().mockReturnValue(checkChain)
    const client = { ...makeUserClient(), from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await updateProductsOrder(orderedIds, 'brand-1')

    expect(result.updated).toBe(0)
    expect(result.error).toBeTruthy()
    expect(result.error).toContain('não pertencem')
  })
})
