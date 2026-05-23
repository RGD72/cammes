import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { setCustomerName } from '@/lib/carts/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const BRAND_ID = '00000000-0000-0000-0000-000000000001'

function makeAuth(user: { id: string } | null = { id: 'user-123' }) {
  return { data: { user } }
}

function makeUpdateChain(count: number, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {} as Record<string, ReturnType<typeof vi.fn>>
  chain.eq = vi.fn()
    .mockReturnValueOnce(chain)
    .mockResolvedValueOnce({ error, count })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setCustomerName', () => {
  it('P-SCN-1: atualiza customer_name e retorna ok:true', async () => {
    const updateChain = makeUpdateChain(1)
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuth()) },
      from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue(updateChain) }),
    })

    const result = await setCustomerName(BRAND_ID, 'João Silva')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeUndefined()
  })

  it('N-SCN-1: retorna PERMISSION_DENIED sem autenticação', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuth(null)) },
      from: vi.fn(),
    })

    const result = await setCustomerName(BRAND_ID, 'João Silva')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('PERMISSION_DENIED')
  })

  it('N-SCN-2: retorna VALIDATION_ERROR para name vazio', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuth()) },
      from: vi.fn(),
    })

    const result = await setCustomerName(BRAND_ID, '')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
  })

  it('N-SCN-3: retorna NOT_FOUND quando cart não existe (0 linhas atualizadas)', async () => {
    const updateChain = makeUpdateChain(0)
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue(makeAuth()) },
      from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue(updateChain) }),
    })

    const result = await setCustomerName(BRAND_ID, 'João Silva')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
  })
})
