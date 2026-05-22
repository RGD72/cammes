import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-uuid-123' } },
      }),
    },
    from: mockFrom,
  }),
}))

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

import { checkUploadRateLimit } from '@/lib/catalogs/actions'

function makeCountChain(count: number | null, error: unknown = null) {
  const gte = vi.fn().mockResolvedValue({ count, error })
  const eq = vi.fn().mockReturnValue({ gte })
  const select = vi.fn().mockReturnValue({ eq })
  return { select, eq, gte }
}

describe('checkUploadRateLimit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna allowed=true, count=0 quando não há uploads na última hora', async () => {
    mockFrom.mockReturnValue(makeCountChain(0))

    const result = await checkUploadRateLimit()

    expect(result).toEqual({ allowed: true, count: 0, limit: 3 })
  })

  it('retorna allowed=true, count=2 com 2 uploads na última hora', async () => {
    mockFrom.mockReturnValue(makeCountChain(2))

    const result = await checkUploadRateLimit()

    expect(result).toEqual({ allowed: true, count: 2, limit: 3 })
  })

  it('retorna allowed=false, count=3 com 3 uploads na última hora', async () => {
    mockFrom.mockReturnValue(makeCountChain(3))

    const result = await checkUploadRateLimit()

    expect(result).toEqual({ allowed: false, count: 3, limit: 3 })
  })

  it('retorna allowed=false quando count > 3', async () => {
    mockFrom.mockReturnValue(makeCountChain(5))

    const result = await checkUploadRateLimit()

    expect(result.allowed).toBe(false)
    expect(result.count).toBe(5)
  })

  it('retorna allowed=true graciosamente se query falhar', async () => {
    mockFrom.mockReturnValue(makeCountChain(null, { message: 'DB error' }))

    const result = await checkUploadRateLimit()

    expect(result).toEqual({ allowed: true, count: 0, limit: 3 })
  })
})
