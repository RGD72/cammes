import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getBrandsForCustomer } from '@/lib/brands/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function makeBrandsChain(
  data: Array<Record<string, unknown>> | null,
  error: { message: string } | null = null,
) {
  const orderFn = vi.fn().mockResolvedValue({ data, error })
  const selectFn = vi.fn().mockReturnValue({ order: orderFn })
  return { select: selectFn }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBrandsForCustomer', () => {
  it('P-GBC-1: retorna array com product_count correto quando usuário tem acesso a marcas', async () => {
    const rawData = [
      {
        id: 'brand-1',
        slug: 'marca-a',
        name: 'Marca A',
        description: 'Descrição da Marca A',
        logo_url: 'https://example.com/logo.png',
        products: [{ count: 5 }],
      },
      {
        id: 'brand-2',
        slug: 'marca-b',
        name: 'Marca B',
        description: null,
        logo_url: null,
        products: [{ count: 0 }],
      },
    ]
    const fromMock = vi.fn().mockReturnValue(makeBrandsChain(rawData))
    const client = { from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await getBrandsForCustomer()

    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe('marca-a')
    expect(result[0].product_count).toBe(5)
    expect(result[1].slug).toBe('marca-b')
    expect(result[1].product_count).toBe(0)
    expect(result[1].logo_url).toBeNull()
  })

  it('N-GBC-1: retorna [] quando query retorna erro', async () => {
    const fromMock = vi.fn().mockReturnValue(makeBrandsChain(null, { message: 'DB error' }))
    const client = { from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await getBrandsForCustomer()

    expect(result).toEqual([])
  })
})
