import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit/log-event', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}))

import { toggleBrandPublished } from '@/lib/brands/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const mockUser = { id: 'admin-user-id' }

function makeUserClient(user: typeof mockUser | null = mockUser) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeCountChain(count: number | null) {
  const eqStatus = vi.fn().mockResolvedValue({ count, error: null })
  const eqBrand = vi.fn().mockReturnValue({ eq: eqStatus })
  const selectFn = vi.fn().mockReturnValue({ eq: eqBrand })
  return { select: selectFn }
}

function makeOwnershipChain(data: { id: string } | null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error: null })
  const eqOwner = vi.fn().mockReturnValue({ single: singleFn })
  const eqId = vi.fn().mockReturnValue({ eq: eqOwner })
  const selectFn = vi.fn().mockReturnValue({ eq: eqId })
  return { select: selectFn }
}

function makeUpdateChain(brand: Record<string, unknown> | null, error: { message: string } | null = null) {
  const singleFn = vi.fn().mockResolvedValue({ data: brand, error })
  const selectFn = vi.fn().mockReturnValue({ single: singleFn })
  const eqOwner = vi.fn().mockReturnValue({ select: selectFn })
  const eqId = vi.fn().mockReturnValue({ eq: eqOwner })
  const updateFn = vi.fn().mockReturnValue({ eq: eqId })
  return { update: updateFn }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toggleBrandPublished', () => {
  it('P-PUB-1: publica com sucesso quando approved > 0 e extracted === 0', async () => {
    const ownershipChain = makeOwnershipChain({ id: 'brand-1' })
    const extractedCountChain = makeCountChain(0)
    const approvedCountChain = makeCountChain(3)
    const updatedBrand = { id: 'brand-1', published: true, published_at: '2026-05-23T00:00:00Z' }
    const updateChain = makeUpdateChain(updatedBrand)

    let callCount = 0
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'brands') {
        callCount++
        if (callCount === 1) return ownershipChain
        return updateChain
      }
      // table === 'products'
      callCount++
      if (callCount === 2) return extractedCountChain
      return approvedCountChain
    })

    const client = { ...makeUserClient(), from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await toggleBrandPublished('brand-1', true)

    expect(result.error).toBeNull()
    expect(result.brand).toMatchObject({ id: 'brand-1', published: true })
  })

  it('N-PUB-1: retorna erro quando há produtos extracted pendentes', async () => {
    const ownershipChain = makeOwnershipChain({ id: 'brand-1' })
    const extractedCountChain = makeCountChain(2)

    let callCount = 0
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'brands') {
        callCount++
        return ownershipChain
      }
      callCount++
      return extractedCountChain
    })

    const client = { ...makeUserClient(), from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await toggleBrandPublished('brand-1', true)

    expect(result.brand).toBeNull()
    expect(result.error).toContain('extraídos')
  })

  it('N-PUB-2: retorna erro quando não há produtos approved', async () => {
    const ownershipChain = makeOwnershipChain({ id: 'brand-1' })
    const extractedCountChain = makeCountChain(0)
    const approvedCountChain = makeCountChain(0)

    let callCount = 0
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'brands') {
        callCount++
        return ownershipChain
      }
      callCount++
      if (callCount === 2) return extractedCountChain
      return approvedCountChain
    })

    const client = { ...makeUserClient(), from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await toggleBrandPublished('brand-1', true)

    expect(result.brand).toBeNull()
    expect(result.error).toContain('Aprove ao menos 1 produto')
  })

  it('P-UNPUB-1: despublicação sempre bem-sucedida independente de contagens', async () => {
    const ownershipChain = makeOwnershipChain({ id: 'brand-1' })
    const updatedBrand = { id: 'brand-1', published: false, published_at: null }
    const updateChain = makeUpdateChain(updatedBrand)

    let callCount = 0
    const fromMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return ownershipChain
      return updateChain
    })

    const client = { ...makeUserClient(), from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await toggleBrandPublished('brand-1', false)

    expect(result.error).toBeNull()
    expect(result.brand).toMatchObject({ id: 'brand-1', published: false })
    // from() deve ser chamado apenas 2x: ownership check + update (sem queries de contagem)
    expect(fromMock).toHaveBeenCalledTimes(2)
  })
})
