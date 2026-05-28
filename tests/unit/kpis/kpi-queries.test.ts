import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))

import { getTmcv, getCme, getCto, getTpe, getAbs } from '@/lib/kpis/queries'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

// ---- helpers ----------------------------------------------------------------

function makeChain(terminalResult: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const fluent = ['from', 'select', 'eq', 'not', 'gte', 'in', 'single', 'maybeSingle']
  fluent.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  Object.assign(chain, {
    then: (res: (v: unknown) => unknown) => Promise.resolve(terminalResult).then(res),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(terminalResult).catch(rej),
  })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- getTmcv ----------------------------------------------------------------

describe('getTmcv', () => {
  it('P-KPI-1: retorna média correta de minutos a partir de extraction_jobs', async () => {
    const now = Date.now()
    const rows = [
      { created_at: new Date(now - 40 * 60 * 1000).toISOString(), completed_at: new Date(now).toISOString() },
      { created_at: new Date(now - 50 * 60 * 1000).toISOString(), completed_at: new Date(now).toISOString() },
    ]
    const chain = makeChain({ data: rows })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const result = await getTmcv()

    expect(result.value).not.toBeNull()
    expect(result.value!).toBeCloseTo(45, 0)
    expect(result.status).toBe('good')
  })

  it('N-KPI-1: retorna null quando não há extraction_jobs com status done', async () => {
    const chain = makeChain({ data: [] })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const result = await getTmcv()

    expect(result.value).toBeNull()
    expect(result.status).toBe('na')
  })
})

// ---- getCme ----------------------------------------------------------------

describe('getCme', () => {
  it('P-KPI-2: retorna média correta de actual_cost_brl', async () => {
    const chain = makeChain({ data: [{ actual_cost_brl: 30 }, { actual_cost_brl: 50 }] })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const result = await getCme()

    expect(result.value).toBeCloseTo(40, 1)
    expect(result.status).toBe('good')
    expect(result.formatted).toBe('R$40.0')
  })

  it('N-KPI-2: retorna null quando não há dados de custo', async () => {
    const chain = makeChain({ data: [] })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const result = await getCme()

    expect(result.value).toBeNull()
    expect(result.status).toBe('na')
  })
})

// ---- getCto ----------------------------------------------------------------

describe('getCto', () => {
  it('P-KPI-3: retorna percentual correto quando há eventos cart_item_added e order_submitted', async () => {
    const rows = [
      { event_type: 'cart_item_added', user_id: 'user-1' },
      { event_type: 'cart_item_added', user_id: 'user-2' },
      { event_type: 'cart_item_added', user_id: 'user-3' },
      { event_type: 'order_submitted', user_id: 'user-1' },
      { event_type: 'order_submitted', user_id: 'user-2' },
    ]
    const chain = makeChain({ data: rows })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const result = await getCto()

    expect(result.value).toBeCloseTo(66.7, 0)
    expect(result.status).toBe('warn')
  })

  it('N-KPI-3: retorna null quando não há eventos cart_item_added (evitar divisão por zero)', async () => {
    const rows = [{ event_type: 'order_submitted', user_id: 'user-1' }]
    const chain = makeChain({ data: rows })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const result = await getCto()

    expect(result.value).toBeNull()
    expect(result.status).toBe('na')
  })
})

// ---- getTpe ----------------------------------------------------------------

describe('getTpe', () => {
  it('P-KPI-4: retorna percentual correto com approved / total de products', async () => {
    const rows = [
      { status: 'approved' },
      { status: 'approved' },
      { status: 'approved' },
      { status: 'extracted' },
      { status: 'hidden' },
    ]
    const chain = makeChain({ data: rows })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const result = await getTpe()

    expect(result.value).toBeCloseTo(60, 0)
    expect(result.status).toBe('bad')
    expect(result.note).toContain('Aproximação')
  })
})

// ---- getAbs ----------------------------------------------------------------

describe('getAbs', () => {
  it('P-KPI-5: retorna contagem correta de brands ativas com pedidos recentes', async () => {
    const orderChain = makeChain({ data: [{ brand_id: 'b1' }, { brand_id: 'b2' }] })
    const brandsChain = makeChain({ count: 2, data: [] })

    const fromMock = vi.fn()
      .mockReturnValueOnce(orderChain)
      .mockReturnValueOnce(brandsChain)

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: fromMock,
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const result = await getAbs()

    expect(result.value).toBe(2)
    expect(result.status).toBe('bad')
  })
})
