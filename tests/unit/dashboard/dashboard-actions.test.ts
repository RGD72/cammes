import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: () => unknown) => fn),
  revalidateTag: vi.fn(),
}))

import {
  getAdminDashboardKpis,
  getRecentOrders,
  getRecentExtractionJobs,
  type AdminDashboardKpis,
} from '@/lib/dashboard/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

// ---- fixtures ---------------------------------------------------------------

const ADMIN_ID = '00000000-0000-0000-0000-000000000001'
const BRAND_ID = '00000000-0000-0000-0000-000000000010'
const ORDER_ID = '00000000-0000-0000-0000-000000000020'
const JOB_ID = '00000000-0000-0000-0000-000000000030'

const MOCK_PUBLISHED_BRANDS = [{ id: BRAND_ID }]
const MOCK_BRANDS_WITH_NAMES = [{ id: BRAND_ID, name: 'Marca Alpha' }]

// ---- helpers ----------------------------------------------------------------

function makeChain(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const fluent = ['select', 'eq', 'in', 'insert', 'update', 'upsert', 'delete', 'order', 'limit', 'gte', 'lt', 'lte']
  fluent.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain['single'] = vi.fn().mockResolvedValue(result)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(result)
  // make chain itself thenable (for direct await without terminal method)
  Object.assign(chain, {
    then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej),
  })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- P-DASH-1: getAdminDashboardKpis returns correct shape ------------------

describe('getAdminDashboardKpis', () => {
  it('P-DASH-1: retorna estrutura correta com todos os campos KPI', async () => {
    const brandsChain = makeChain({ data: MOCK_PUBLISHED_BRANDS, error: null })
    const productsChain = makeChain({ count: 12, error: null })
    const ordersThisMonthChain = makeChain({ count: 5, error: null })
    const ordersLastMonthChain = makeChain({ count: 3, error: null })
    const costChain = makeChain({
      data: [
        { actual_cost_usd: 0.50, actual_cost_brl: 2.75 },
        { actual_cost_usd: 0.25, actual_cost_brl: 1.25 },
      ],
      error: null,
    })
    const ordersByDayChain = makeChain({
      data: [
        { submitted_at: '2026-05-01T10:00:00Z' },
        { submitted_at: '2026-05-01T15:00:00Z' },
        { submitted_at: '2026-05-02T09:00:00Z' },
      ],
      error: null,
    })

    let callCount = 0
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'brands') return brandsChain
        if (table === 'products') return productsChain
        if (table === 'orders') {
          callCount++
          if (callCount === 1) return ordersThisMonthChain
          if (callCount === 2) return ordersLastMonthChain
          return ordersByDayChain
        }
        if (table === 'extraction_jobs') return costChain
        return makeChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    const result: AdminDashboardKpis = await getAdminDashboardKpis(ADMIN_ID)

    expect(result.brandCount).toBe(1)
    expect(result.productCount).toBe(12)
    expect(result.ordersThisMonth).toBe(5)
    expect(result.ordersLastMonth).toBe(3)
    expect(result.openrouterCostUsd).toBeCloseTo(0.75)
    expect(result.openrouterCostBrl).toBeCloseTo(4.0)
    expect(Array.isArray(result.ordersByDay)).toBe(true)
  })

  it('P-DASH-2: unstable_cache é chamado com a tag correta', async () => {
    // unstable_cache is mocked as passthrough — verify it was called with correct key/tag
    const serverClient = {
      from: vi.fn().mockImplementation(() => makeChain({ data: [], count: 0, error: null })),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    await getAdminDashboardKpis(ADMIN_ID)

    expect(vi.mocked(unstable_cache)).toHaveBeenCalledWith(
      expect.any(Function),
      ['kpis', ADMIN_ID],
      expect.objectContaining({ tags: [`kpis:admin:${ADMIN_ID}`], revalidate: 60 }),
    )
  })

  it('N-DASH-1: retorna zeros quando admin não tem brands', async () => {
    const emptyBrandsChain = makeChain({ data: [], error: null })

    const serverClient = {
      from: vi.fn().mockReturnValue(emptyBrandsChain),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    const result: AdminDashboardKpis = await getAdminDashboardKpis(ADMIN_ID)

    expect(result.brandCount).toBe(0)
    expect(result.productCount).toBe(0)
    expect(result.ordersThisMonth).toBe(0)
    expect(result.ordersLastMonth).toBe(0)
    expect(result.openrouterCostUsd).toBe(0)
    expect(result.openrouterCostBrl).toBe(0)
    expect(result.ordersByDay).toEqual([])
  })
})

// ---- getRecentOrders --------------------------------------------------------

describe('getRecentOrders', () => {
  it('retorna lista de pedidos recentes com brand_name preenchido', async () => {
    const brandsChain = makeChain({ data: MOCK_BRANDS_WITH_NAMES, error: null })
    const ordersChain = makeChain({
      data: [
        {
          id: ORDER_ID,
          submitted_at: '2026-05-20T10:00:00Z',
          brand_id: BRAND_ID,
          customer_name: 'Ana Silva',
          total_brl: 199.90,
          status: 'received',
        },
      ],
      error: null,
    })

    let brandsCalled = false
    const serverClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'brands') {
          if (!brandsCalled) { brandsCalled = true; return brandsChain }
          return brandsChain
        }
        if (table === 'orders') return ordersChain
        return makeChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    const result = await getRecentOrders(ADMIN_ID, 5)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(ORDER_ID)
    expect(result[0].brand_name).toBe('Marca Alpha')
    expect(result[0].customer_name).toBe('Ana Silva')
  })

  it('retorna [] quando admin não tem brands', async () => {
    const emptyChain = makeChain({ data: [], error: null })
    const serverClient = { from: vi.fn().mockReturnValue(emptyChain) }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    const result = await getRecentOrders(ADMIN_ID)
    expect(result).toEqual([])
  })
})

// ---- getRecentExtractionJobs ------------------------------------------------

describe('getRecentExtractionJobs', () => {
  it('retorna lista de jobs recentes com brand_name preenchido', async () => {
    const brandsChain = makeChain({ data: MOCK_BRANDS_WITH_NAMES, error: null })
    const jobsChain = makeChain({
      data: [
        {
          id: JOB_ID,
          created_at: '2026-05-19T08:00:00Z',
          brand_id: BRAND_ID,
          status: 'completed',
          pages_total: 100,
          pages_processed: 100,
          actual_cost_usd: 0.30,
          actual_cost_brl: 1.65,
          catalog_id: null,
        },
      ],
      error: null,
    })

    let brandsCalled = false
    const serverClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'brands') {
          if (!brandsCalled) { brandsCalled = true; return brandsChain }
          return brandsChain
        }
        if (table === 'extraction_jobs') return jobsChain
        return makeChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    const result = await getRecentExtractionJobs(ADMIN_ID, 5)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(JOB_ID)
    expect(result[0].brand_name).toBe('Marca Alpha')
    expect(result[0].status).toBe('completed')
    expect(result[0].actual_cost_usd).toBe(0.30)
  })

  it('retorna [] quando admin não tem brands', async () => {
    const emptyChain = makeChain({ data: [], error: null })
    const serverClient = { from: vi.fn().mockReturnValue(emptyChain) }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    const result = await getRecentExtractionJobs(ADMIN_ID)
    expect(result).toEqual([])
  })
})
