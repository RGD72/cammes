import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockDecryptKey } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockDecryptKey: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('@/lib/openrouter/crypto', () => ({
  decryptKey: mockDecryptKey,
}))

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

import { getAdminOpenRouterKey, getAdminOpenRouterModel } from '@/lib/openrouter/get-key'

function makeChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

describe('getAdminOpenRouterKey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna null quando admin_settings não existe para o admin', async () => {
    const chain = makeChain({ data: null, error: { message: 'No rows' } })
    mockFrom.mockReturnValue(chain)

    const result = await getAdminOpenRouterKey('admin-uuid-123')

    expect(result).toBeNull()
    expect(mockDecryptKey).not.toHaveBeenCalled()
  })

  it('retorna null quando openrouter_key_encrypted é null', async () => {
    const chain = makeChain({ data: { openrouter_key_encrypted: null }, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getAdminOpenRouterKey('admin-uuid-123')

    expect(result).toBeNull()
    expect(mockDecryptKey).not.toHaveBeenCalled()
  })

  it('descriptografa e retorna chave quando presente', async () => {
    const chain = makeChain({
      data: { openrouter_key_encrypted: 'encrypted-base64' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    mockDecryptKey.mockResolvedValue('sk-or-v1-plaintext-key')

    const result = await getAdminOpenRouterKey('admin-uuid-123')

    expect(mockDecryptKey).toHaveBeenCalledWith('encrypted-base64')
    expect(result).toBe('sk-or-v1-plaintext-key')
  })

  it('retorna null sem lançar quando decryptKey falha', async () => {
    const chain = makeChain({
      data: { openrouter_key_encrypted: 'bad-data' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    mockDecryptKey.mockRejectedValue(new Error('Decryption failed'))

    const result = await getAdminOpenRouterKey('admin-uuid-123')

    expect(result).toBeNull()
  })
})

describe('getAdminOpenRouterModel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna modelo configurado quando presente', async () => {
    const chain = makeChain({ data: { openrouter_model: 'openai/gpt-4o' }, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await getAdminOpenRouterModel('admin-uuid-123')

    expect(result).toBe('openai/gpt-4o')
  })

  it('retorna modelo padrão quando admin_settings não existe', async () => {
    const chain = makeChain({ data: null, error: { message: 'No rows' } })
    mockFrom.mockReturnValue(chain)

    const result = await getAdminOpenRouterModel('admin-uuid-123')

    expect(result).toBe('google/gemini-2.5-flash')
  })
})
